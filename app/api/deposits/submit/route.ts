/**
 * POST /api/admin/deposits/approve
 *
 * Admin confirms or rejects a crypto deposit.
 * This is the most critical financial endpoint — it triggers the
 * first two ledger transactions in a contract's life.
 *
 * On APPROVE, two separate ledger transactions are posted (per spec §3.2):
 *
 *   TX 1 — entry_type: 'DEPOSIT'
 *     DR  PLATFORM_DEPOSIT_CLEARING   (remove from clearing)
 *     CR  USER_WALLET                 (credit user available balance)
 *
 *   TX 2 — entry_type: 'INVESTMENT_CREATION'
 *     DR  USER_WALLET                 (debit available)
 *     CR  USER_CAPITAL_LOCKED         (lock capital in contract)
 *
 * Then:
 *   - deposit.status → 'APPROVED'
 *   - contract.state → 'ACTIVE', activated_at + maturity_date set
 *   - wc_wallet_balances.locked_capital incremented (performance cache)
 *   - wc_admin_audit_log entry created
 *
 * IMPORTANT: wc_admins.user_id maps to the auth user, NOT wc_admins.id.
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

  // 2. Verify admin — wc_admins.user_id = auth user id (NOT wc_admins.id)
  const { data: adminRow, error: adminErr } = await adminClient
    .from("wc_admins")
    .select("id, role, is_active")
    .eq("user_id", user.id)     // ← user_id column, not id
    .single();

  if (adminErr || !adminRow || !adminRow.is_active) {
    return NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 });
  }

  // Only FINANCE and SUPER_ADMIN can approve deposits
  if (!["SUPER_ADMIN", "FINANCE"].includes(adminRow.role)) {
    return NextResponse.json(
      { error: "Forbidden: FINANCE or SUPER_ADMIN role required" },
      { status: 403 }
    );
  }

  // 3. Parse body
  let body: {
    deposit_id: string;
    action: "approve" | "reject";
    rejection_reason?: string;
    admin_notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { deposit_id, action, rejection_reason, admin_notes } = body;
  if (!deposit_id || !action) {
    return NextResponse.json(
      { error: "deposit_id and action ('approve' | 'reject') are required" },
      { status: 400 }
    );
  }
  if (action === "reject" && !rejection_reason) {
    return NextResponse.json(
      { error: "rejection_reason is required when rejecting" },
      { status: 400 }
    );
  }

  // 4. Fetch deposit
  const { data: deposit, error: depositErr } = await adminClient
    .from("wc_deposits")
    .select("id, user_id, amount, currency, payment_reference, status, metadata")
    .eq("id", deposit_id)
    .single();

  if (depositErr || !deposit) {
    return NextResponse.json({ error: "Deposit not found" }, { status: 404 });
  }
  if (deposit.status !== "PENDING") {
    return NextResponse.json(
      { error: `Deposit is '${deposit.status}' — only PENDING deposits can be actioned` },
      { status: 409 }
    );
  }

  // 5. Get linked contract from deposit metadata
  const meta = deposit.metadata as Record<string, string>;
  const contractId = meta?.contract_id;
  if (!contractId) {
    return NextResponse.json(
      { error: "Deposit has no linked contract in metadata — data integrity issue" },
      { status: 500 }
    );
  }

  const { data: contract, error: contractErr } = await adminClient
    .from("wc_contracts")
    .select("id, state, principal_amount, duration_days_snapshot, profit_rate_snapshot, plan_tier, release_delay_days")
    .eq("id", contractId)
    .single();

  if (contractErr || !contract) {
    return NextResponse.json({ error: "Linked contract not found" }, { status: 404 });
  }
  if (contract.state !== "PENDING") {
    return NextResponse.json(
      { error: `Contract is in state '${contract.state}' — expected 'PENDING'` },
      { status: 409 }
    );
  }

  const amount = parseFloat(contract.principal_amount).toFixed(8);
  const userId = deposit.user_id;
  const now = new Date();

  // ── REJECT ────────────────────────────────────────────────────────────────
  if (action === "reject") {
    const { error: rejectDepErr } = await adminClient
      .from("wc_deposits")
      .update({
        status: "REJECTED",
        rejection_reason,
        notes: admin_notes ?? null,
        reviewed_by: user.id,
        reviewed_at: now.toISOString(),
      })
      .eq("id", deposit_id);

    if (rejectDepErr) {
      return NextResponse.json({ error: "Failed to reject deposit" }, { status: 500 });
    }

    await adminClient
      .from("wc_contracts")
      .update({ state: "CANCELLED", cancelled_at: now.toISOString() })
      .eq("id", contractId);

    // Audit log
    await adminClient.from("wc_admin_audit_log").insert({
      admin_id: adminRow.id,
      action_type: "REJECT_DEPOSIT",
      target_user_id: userId,
      target_deposit_id: deposit_id,
      target_contract_id: contractId,
      before_state: { deposit_status: "PENDING", contract_state: "PENDING" },
      after_state: { deposit_status: "REJECTED", contract_state: "CANCELLED" },
      reason: rejection_reason!,
    });

    return NextResponse.json({
      message: "Deposit rejected and contract cancelled.",
      deposit_id,
      contract_id: contractId,
    });
  }

  // ── APPROVE ───────────────────────────────────────────────────────────────
  const startDate = now.toISOString().split("T")[0];           // YYYY-MM-DD
  const maturityDate = new Date(now);
  maturityDate.setDate(maturityDate.getDate() + contract.duration_days_snapshot);
  const maturityDateStr = maturityDate.toISOString().split("T")[0];

  // Release eligible date (maturity + release delay)
  const releaseDate = new Date(maturityDate);
  releaseDate.setDate(releaseDate.getDate() + (contract.release_delay_days ?? 0));
  const releaseDateStr = releaseDate.toISOString().split("T")[0];

  try {
    // TX 1: DEPOSIT — DR PLATFORM_DEPOSIT_CLEARING / CR USER_WALLET
    const { transactionId: depositTxId } = await postLedgerTransaction({
      entryType: "DEPOSIT",
      userId,
      contractId,
      depositId: deposit_id,
      description: `Deposit confirmed — ${amount} ${deposit.currency} | tx: ${deposit.payment_reference ?? "manual"}`,
      amount,
      currency: deposit.currency,
      idempotencyKey: `deposit_confirmed_${deposit_id}`,
      initiatedBy: user.id,
      adminNotes: admin_notes,
      lines: [
        {
          accountType: "PLATFORM_DEPOSIT_CLEARING",
          direction: "DEBIT",
          amount,
          userId: undefined,    // platform account — no user_id
        },
        {
          accountType: "USER_WALLET",
          direction: "CREDIT",
          amount,
          userId,
        },
      ],
    });

    // TX 2: INVESTMENT_CREATION — DR USER_WALLET / CR USER_CAPITAL_LOCKED
    const { transactionId: investTxId } = await postLedgerTransaction({
      entryType: "INVESTMENT_CREATION",
      userId,
      contractId,
      description: `Investment created — ${amount} ${deposit.currency} locked in contract ${contractId}`,
      amount,
      currency: deposit.currency,
      idempotencyKey: `investment_creation_${contractId}`,
      initiatedBy: user.id,
      lines: [
        {
          accountType: "USER_WALLET",
          direction: "DEBIT",
          amount,
          userId,
        },
        {
          accountType: "USER_CAPITAL_LOCKED",
          direction: "CREDIT",
          amount,
          userId,
        },
      ],
    });

    // Update deposit — mark APPROVED, link ledger tx
    await adminClient
      .from("wc_deposits")
      .update({
        status: "APPROVED",
        reviewed_by: user.id,
        reviewed_at: now.toISOString(),
        notes: admin_notes ?? null,
        ledger_tx_id: depositTxId,
      })
      .eq("id", deposit_id);

    // Activate contract
    await adminClient
      .from("wc_contracts")
      .update({
        state: "ACTIVE",
        activated_at: now.toISOString(),
        maturity_date: maturityDateStr,
        release_eligible_date: releaseDateStr,
        creation_ledger_tx_id: investTxId,
      })
      .eq("id", contractId);

    // Update wallet cache — locked_capital column (NOT locked_balance)
    await adminClient.rpc("increment_locked_capital", {
      p_user_id: userId,
      p_amount: amount,
    }).then(({ error }) => {
      if (error) console.error("Wallet cache update failed (non-fatal):", error.message);
    });

    // Audit log
    await adminClient.from("wc_admin_audit_log").insert({
      admin_id: adminRow.id,
      action_type: "APPROVE_DEPOSIT",
      target_user_id: userId,
      target_deposit_id: deposit_id,
      target_contract_id: contractId,
      before_state: { deposit_status: "PENDING", contract_state: "PENDING" },
      after_state: { deposit_status: "APPROVED", contract_state: "ACTIVE", maturity_date: maturityDateStr },
      reason: admin_notes ?? "Deposit confirmed by admin",
      ledger_tx_id: investTxId,
    });

    return NextResponse.json({
      message: "Deposit approved. Contract is now ACTIVE.",
      contract: {
        id: contractId,
        state: "ACTIVE",
        start_date: startDate,
        maturity_date: maturityDateStr,
        release_eligible_date: releaseDateStr,
        principal_amount: amount,
      },
      ledger: {
        deposit_tx_id: depositTxId,
        investment_tx_id: investTxId,
      },
    });
  } catch (err) {
    console.error("Deposit approval error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error during approval" },
      { status: 500 }
    );
  }
}