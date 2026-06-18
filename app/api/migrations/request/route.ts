/**
 * POST /api/migrations/request
 *
 * User requests to migrate capital from one plan to another.
 * Migration moves the principal of a MATURED contract into a new plan.
 *
 * Rules (from schema + architecture spec):
 * - Source contract must be in MATURED state
 * - Target plan must be different from source plan
 * - UPGRADE: target min_amount > source principal → user must top up from available_balance
 * - DOWNGRADE: target max_amount < source principal → not allowed (capital cannot be split)
 * - A contract can only have one pending migration (unique constraint in schema)
 * - No ledger entries posted here — posted on admin approval
 *
 * Flow:
 * 1. Validate source contract is MATURED and belongs to user
 * 2. Validate target plan accepts the capital amount
 * 3. If top-up needed, verify available_balance covers it
 * 4. Create wc_migrations record in PENDING state
 * 5. Set source contract.state → MIGRATION_PENDING
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/supabase/server";
import { adminClient } from "@/lib/ledger";

export async function POST(req: NextRequest) {
  // 1. Auth
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse body
  let body: {
    source_contract_id: string;
    target_plan_id: string;
    topup_amount?: string;   // optional extra capital from available_balance
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { source_contract_id, target_plan_id, topup_amount = "0" } = body;

  if (!source_contract_id || !target_plan_id) {
    return NextResponse.json(
      { error: "source_contract_id and target_plan_id are required" },
      { status: 400 }
    );
  }

  const topupNum = parseFloat(topup_amount);
  if (isNaN(topupNum) || topupNum < 0) {
    return NextResponse.json(
      { error: "topup_amount must be a non-negative number" },
      { status: 400 }
    );
  }

  // 3. Fetch source contract
  const { data: sourceContract, error: sourceErr } = await adminClient
    .from("wc_contracts")
    .select("id, user_id, plan_id, plan_tier, state, principal_amount")
    .eq("id", source_contract_id)
    .single();

  if (sourceErr || !sourceContract) {
    return NextResponse.json({ error: "Source contract not found" }, { status: 404 });
  }
  if (sourceContract.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (sourceContract.state !== "MATURED") {
    return NextResponse.json(
      { error: `Source contract must be in MATURED state. Current state: ${sourceContract.state}` },
      { status: 400 }
    );
  }
  if (sourceContract.plan_id === target_plan_id) {
    return NextResponse.json(
      { error: "Target plan must be different from source plan" },
      { status: 400 }
    );
  }

  // 4. Check no existing pending migration on this contract
  const { data: existingMigration } = await adminClient
    .from("wc_migrations")
    .select("id, status")
    .eq("source_contract_id", source_contract_id)
    .maybeSingle();

  if (existingMigration) {
    return NextResponse.json(
      { error: `A migration already exists for this contract (status: ${existingMigration.status})` },
      { status: 409 }
    );
  }

  // 5. Fetch target plan
  const { data: targetPlan, error: targetPlanErr } = await adminClient
    .from("wc_investment_plans")
    .select("id, tier, label, min_amount, max_amount, is_active")
    .eq("id", target_plan_id)
    .single();

  if (targetPlanErr || !targetPlan) {
    return NextResponse.json({ error: "Target plan not found" }, { status: 404 });
  }
  if (!targetPlan.is_active) {
    return NextResponse.json(
      { error: "Target plan is not currently active" },
      { status: 400 }
    );
  }

  // 6. Validate capital amounts
  const capitalAmount = parseFloat(sourceContract.principal_amount);
  const totalNewPrincipal = capitalAmount + topupNum;
  const targetMin = parseFloat(targetPlan.min_amount);
  const targetMax = targetPlan.max_amount ? parseFloat(targetPlan.max_amount) : Infinity;

  if (totalNewPrincipal < targetMin) {
    return NextResponse.json(
      {
        error: `Total capital (${totalNewPrincipal.toFixed(8)}) is below minimum for ${targetPlan.label} (${targetMin.toFixed(8)}). Add a top-up of at least ${(targetMin - capitalAmount).toFixed(8)}.`,
      },
      { status: 400 }
    );
  }
  if (totalNewPrincipal > targetMax) {
    return NextResponse.json(
      {
        error: `Total capital (${totalNewPrincipal.toFixed(8)}) exceeds maximum for ${targetPlan.label} (${targetMax.toFixed(8)}).`,
      },
      { status: 400 }
    );
  }

  // 7. If top-up needed, verify available_balance
  if (topupNum > 0) {
    const { data: wallet } = await adminClient
      .from("wc_wallet_balances")
      .select("available_balance")
      .eq("user_id", user.id)
      .single();

    const available = parseFloat(wallet?.available_balance ?? "0");
    if (topupNum > available) {
      return NextResponse.json(
        {
          error: `Insufficient available balance for top-up. Available: ${available.toFixed(8)}, Required: ${topupNum.toFixed(8)}`,
        },
        { status: 400 }
      );
    }
  }

  // 8. Determine migration type
  const sourceTierOrder = ["WERTCHAIN_START", "WERTCHAIN_GROWTH", "WERTCHAIN_PROFESSIONAL", "WERTCHAIN_ELITE"];
  const sourceIdx = sourceTierOrder.indexOf(sourceContract.plan_tier);
  const targetIdx = sourceTierOrder.indexOf(targetPlan.tier);
  const migrationType =
    targetIdx > sourceIdx ? "UPGRADE" :
    targetIdx < sourceIdx ? "DOWNGRADE" :
    "SAME_PLAN";

  try {
    // 9. Create migration record
    const { data: migration, error: migrationErr } = await adminClient
      .from("wc_migrations")
      .insert({
        user_id: user.id,
        source_contract_id,
        target_plan_id,
        target_plan_tier: targetPlan.tier,
        capital_amount: capitalAmount.toFixed(8),
        topup_amount: topupNum.toFixed(8),
        migration_type: migrationType,
        status: "PENDING",
      })
      .select("id, status, created_at")
      .single();

    if (migrationErr || !migration) {
      throw new Error(`Failed to create migration: ${migrationErr?.message}`);
    }

    // 10. Transition source contract to MIGRATION_PENDING
    const { error: contractUpdateErr } = await adminClient
      .from("wc_contracts")
      .update({ state: "MIGRATION_PENDING" })
      .eq("id", source_contract_id);

    if (contractUpdateErr) {
      // Roll back migration record
      await adminClient.from("wc_migrations").delete().eq("id", migration.id);
      throw new Error(`Failed to update contract state: ${contractUpdateErr.message}`);
    }

    return NextResponse.json(
      {
        message: "Migration request submitted. Awaiting admin approval.",
        migration: {
          id: migration.id,
          source_contract_id,
          target_plan: targetPlan.label,
          target_tier: targetPlan.tier,
          capital_amount: capitalAmount.toFixed(8),
          topup_amount: topupNum.toFixed(8),
          total_new_principal: totalNewPrincipal.toFixed(8),
          migration_type: migrationType,
          status: migration.status,
          created_at: migration.created_at,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
