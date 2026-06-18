/**
 * POST /api/admin/migrations/approve
 *
 * Admin approves or rejects a migration request.
 *
 * On APPROVE — three atomic operations per schema spec §9 (MIGRATION_DEBIT → MIGRATION_CREDIT):
 *
 * TX 1: MIGRATION_DEBIT (debit old contract capital to transit)
 * DR  USER_CAPITAL_LOCKED         (remove from old contract)
 * CR  PLATFORM_MIGRATION_RESERVE  (capital in transit)
 *
 * TX 2: MIGRATION_CREDIT (credit new contract capital from transit)
 * DR  PLATFORM_MIGRATION_RESERVE  (exit transit)
 * CR  USER_CAPITAL_LOCKED         (locked in new contract)
 *
 * If topup_amount > 0, also post TOP_UP tx:
 * DR  USER_WALLET                 (debit top-up from available)
 * CR  USER_CAPITAL_LOCKED         (add to new contract)
 *
 * Then:
 * - Create new wc_contracts record (state=ACTIVE)
 * - Set migration.new_contract_id, status → APPROVED
 * - Set old contract.state → MIGRATED (terminal)
 * - Decrement locked_capital (old principal), increment locked_capital (new principal)
 * - If topup: decrement available_balance
 *
 * On REJECT:
 * - migration.status → REJECTED
 * - source contract.state → MATURED (returns to previous state)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { adminClient, postLedgerTransaction } from "@/lib/ledger";

export async function POST(req: NextRequest) {
  // 1. Auth
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Verify admin
  const { data: adminRow, error: adminErr } = await adminClient
    .from("wc_admins")
    .select("id, role, is_active")
    .eq("user_id", user.id)
    .single();

  if (adminErr || !adminRow || !adminRow.is_active) {
    return NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 });
  }
  if (!["SUPER_ADMIN", "FINANCE"].includes(adminRow.role)) {
    return NextResponse.json({ error: "Forbidden: FINANCE or SUPER_ADMIN role required" }, { status: 403 });
  }

  // 3. Parse body
  let body: {
    migration_id: string;
    action: "approve" | "reject";
    rejection_reason?: string;
    admin_notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { migration_id, action, rejection_reason, admin_notes } = body;
  if (!migration_id || !action) {
    return NextResponse.json(
      { error: "migration_id and action ('approve' | 'reject') are required" },
      { status: 400 }
    );
  }
  if (action === "reject" && !rejection_reason) {
    return NextResponse.json(
      { error: "rejection_reason is required when rejecting" },
      { status: 400 }
    );
  }

  // 4. Fetch migration + source contract + target plan
  const { data: migration, error: migErr } = await adminClient
    .from("wc_migrations")
    .select("id, user_id, source_contract_id, target_plan_id, target_plan_tier, capital_amount, topup_amount, total_new_principal, migration_type, status")
    .eq("id", migration_id)
    .single();

  if (migErr || !migration) {
    return NextResponse.json({ error: "Migration not found" }, { status: 404 });
  }
  if (migration.status !== "PENDING") {
    return NextResponse.json(
      { error: `Migration is '${migration.status}' — only PENDING migrations can be actioned` },
      { status: 409 }
    );
  }

  const { data: sourceContract, error: sourceErr } = await adminClient
    .from("wc_contracts")
    .select("id, state, plan_id, plan_tier, duration_days_snapshot, profit_rate_snapshot, release_delay_days")
    .eq("id", migration.source_contract_id)
    .single();

  if (sourceErr || !sourceContract) {
    return NextResponse.json({ error: "Source contract not found" }, { status: 404 });
  }
  if (sourceContract.state !== "MIGRATION_PENDING") {
    return NextResponse.json(
      { error: `Source contract is '${sourceContract.state}' — expected MIGRATION_PENDING` },
      { status: 409 }
    );
  }

  const { data: targetPlan, error: targetPlanErr } = await adminClient
    .from("wc_investment_plans")
    .select("id, tier, label, duration_days, profit_rate, capital_release_delay_days, is_active")
    .eq("id", migration.target_plan_id)
    .single();

  if (targetPlanErr || !targetPlan) {
    return NextResponse.json({ error: "Target plan not found" }, { status: 404 });
  }

  const now = new Date();
  const capitalStr = parseFloat(migration.capital_amount).toFixed(8);
  const topupNum = parseFloat(migration.topup_amount);
  const topupStr = topupNum.toFixed(8);
  const totalPrincipal = parseFloat(migration.total_new_principal);
  const totalPrincipalStr = totalPrincipal.toFixed(8);
  const userId = migration.user_id;

  // ── REJECT ────────────────────────────────────────────────────────────────
  if (action === "reject") {
    await adminClient.from("wc_migrations").update({
      status: "REJECTED",
      rejection_reason,
      reviewed_by: user.id,
      reviewed_at: now.toISOString(),
      notes: admin_notes ?? null,
    }).eq("id", migration_id);

    // Return source contract to MATURED so user can try again
    await adminClient.from("wc_contracts").update({
      state: "MATURED",
    }).eq("id", migration.source_contract_id);

    await adminClient.from("wc_admin_audit_log").insert({
      admin_id: adminRow.id,
      action_type: "REJECT_MIGRATION",
      target_user_id: userId,
      target_migration_id: migration_id,
      target_contract_id: migration.source_contract_id,
      before_state: { migration_status: "PENDING", contract_state: "MIGRATION_PENDING" },
      after_state: { migration_status: "REJECTED", contract_state: "MATURED" },
      reason: rejection_reason!,
    });

    return NextResponse.json({
      message: "Migration rejected. Source contract returned to MATURED state.",
      migration_id,
    });
  }

  // ── APPROVE ───────────────────────────────────────────────────────────────
  try {
    // Calculate new contract financials using TARGET plan rates
    const newDuration = targetPlan.duration_days;
    const newProfitRate = parseFloat(targetPlan.profit_rate);
    const newDailyProfit = (totalPrincipal * newProfitRate) / newDuration;
    const newExpectedProfit = totalPrincipal * newProfitRate;

    const startDate = now.toISOString().split("T")[0];
    const maturityDate = new Date(now);
    maturityDate.setDate(maturityDate.getDate() + newDuration);
    const maturityDateStr = maturityDate.toISOString().split("T")[0];
    const releaseDate = new Date(maturityDate);
    releaseDate.setDate(releaseDate.getDate() + targetPlan.capital_release_delay_days);
    const releaseDateStr = releaseDate.toISOString().split("T")[0];

    // Create new contract first (we need its id for the ledger description)
    const { data: newContract, error: newContractErr } = await adminClient
      .from("wc_contracts")
      .insert({
        user_id: userId,
        plan_id: targetPlan.id,
        plan_tier: targetPlan.tier,
        principal_amount: totalPrincipalStr,
        expected_profit: newExpectedProfit.toFixed(8),
        daily_profit_amount: newDailyProfit.toFixed(8),
        profit_rate_snapshot: newProfitRate.toFixed(6),
        duration_days_snapshot: newDuration,
        state: "ACTIVE",
        auto_reinvest: true,
        release_delay_days: targetPlan.capital_release_delay_days,
        activated_at: now.toISOString(),
        maturity_date: maturityDateStr,
        release_eligible_date: releaseDateStr,
        parent_contract_id: migration.source_contract_id,
        origin_type: "MIGRATION",
      })
      .select("id")
      .single();

    if (newContractErr || !newContract) {
      throw new Error(`Failed to create new contract: ${newContractErr?.message}`);
    }

    // TX 1: MIGRATION_DEBIT — DR USER_CAPITAL_LOCKED / CR PLATFORM_MIGRATION_RESERVE
    const { transactionId: debitTxId } = await postLedgerTransaction({
      entryType: "MIGRATION_DEBIT",
      userId,
      contractId: migration.source_contract_id,
      migrationId: migration_id,
      description: `Migration debit — capital exiting contract ${migration.source_contract_id} to transit`,
      amount: capitalStr,
      idempotencyKey: `migration_debit_${migration_id}`,
      initiatedBy: user.id,
      lines: [
        {
          accountType: "USER_CAPITAL_LOCKED",
          direction: "DEBIT",
          amount: capitalStr,
          userId,
        },
        {
          accountType: "PLATFORM_MIGRATION_RESERVE",
          direction: "CREDIT",
          amount: capitalStr,
          userId: undefined,
        },
      ],
    });

    // TX 2: MIGRATION_CREDIT — DR PLATFORM_MIGRATION_RESERVE / CR USER_CAPITAL_LOCKED
    const { transactionId: creditTxId } = await postLedgerTransaction({
      entryType: "MIGRATION_CREDIT",
      userId,
      contractId: newContract.id,
      migrationId: migration_id,
      description: `Migration credit — capital entering new contract ${newContract.id} from transit`,
      amount: capitalStr,
      idempotencyKey: `migration_credit_${migration_id}`,
      initiatedBy: user.id,
      lines: [
        {
          accountType: "PLATFORM_MIGRATION_RESERVE",
          direction: "DEBIT",
          amount: capitalStr,
          userId: undefined,
        },
        {
          accountType: "USER_CAPITAL_LOCKED",
          direction: "CREDIT",
          amount: capitalStr,
          userId,
        },
      ],
    });

    // TX 3 (conditional): TOP_UP — DR USER_WALLET / CR USER_CAPITAL_LOCKED
    if (topupNum > 0) {
      await postLedgerTransaction({
        entryType: "TOP_UP",
        userId,
        contractId: newContract.id,
        migrationId: migration_id,
        description: `Migration top-up — ${topupStr} added to new contract ${newContract.id}`,
        amount: topupStr,
        idempotencyKey: `migration_topup_${migration_id}`,
        initiatedBy: user.id,
        lines: [
          {
            accountType: "USER_WALLET",
            direction: "DEBIT",
            amount: topupStr,
            userId,
          },
          {
            accountType: "USER_CAPITAL_LOCKED",
            direction: "CREDIT",
            amount: topupStr,
            userId,
          },
        ],
      });

      // Decrement available_balance for top-up
      await adminClient.rpc("decrement_available_balance", {
        p_user_id: userId,
        p_amount: topupStr,
      }).then(({ error }) => {
        if (error) console.error("available_balance decrement failed (non-fatal):", error.message);
      });
    }

    // Update migration record
    await adminClient.from("wc_migrations").update({
      status: "APPROVED",
      new_contract_id: newContract.id,
      reviewed_by: user.id,
      reviewed_at: now.toISOString(),
      notes: admin_notes ?? null,
      debit_ledger_tx_id: debitTxId,
      credit_ledger_tx_id: creditTxId,
    }).eq("id", migration_id);

    // Close old contract → MIGRATED (terminal state)
    await adminClient.from("wc_contracts").update({
      state: "MIGRATED",
      closure_ledger_tx_id: debitTxId,
    }).eq("id", migration.source_contract_id);

    // Update new contract with creation ledger tx
    await adminClient.from("wc_contracts").update({
      creation_ledger_tx_id: creditTxId,
    }).eq("id", newContract.id);

    // Wallet cache: locked_capital stays the same if no topup,
    // or increases by topup_amount if there is one (capital→capital transfer is neutral)
    if (topupNum > 0) {
      await adminClient.rpc("increment_locked_capital", {
        p_user_id: userId,
        p_amount: topupStr,
      }).then(({ error }) => {
        if (error) console.error("locked_capital cache update failed (non-fatal):", error.message);
      });
    }

    // Audit log
    await adminClient.from("wc_admin_audit_log").insert({
      admin_id: adminRow.id,
      action_type: "APPROVE_MIGRATION",
      target_user_id: userId,
      target_migration_id: migration_id,
      target_contract_id: migration.source_contract_id,
      before_state: { migration_status: "PENDING", contract_state: "MIGRATION_PENDING" },
      after_state: {
        migration_status: "APPROVED",
        old_contract_state: "MIGRATED",
        new_contract_id: newContract.id,
        new_contract_state: "ACTIVE",
      },
      reason: admin_notes ?? "Migration approved",
      ledger_tx_id: creditTxId,
    });

    return NextResponse.json({
      message: "Migration approved. New contract is ACTIVE.",
      migration: {
        id: migration_id,
        status: "APPROVED",
        old_contract_id: migration.source_contract_id,
        new_contract: {
          id: newContract.id,
          state: "ACTIVE",
          plan: targetPlan.label,
          principal_amount: totalPrincipalStr,
          maturity_date: maturityDateStr,
        },
      },
      ledger: {
        debit_tx_id: debitTxId,
        credit_tx_id: creditTxId,
      },
    });
  } catch (err) {
    console.error("Migration approval error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error during migration approval" },
      { status: 500 }
    );
  }
}
