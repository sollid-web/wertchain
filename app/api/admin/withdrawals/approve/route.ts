/**
 * POST /api/admin/withdrawals/approve
 *
 * Admin approves or rejects a pending withdrawal request.
 *
 * On APPROVE:
 *   Post WITHDRAWAL_APPROVED ledger tx:
 *     DR  PLATFORM_WITHDRAWAL_RESERVE   (release from reserve)
 *     CR  PLATFORM_REVENUE              (fee portion, if any)
 *     CR  SYSTEM_SUSPENSE               (net payout — exits platform)
 *   Then:
 *     - withdrawal.status → APPROVED
 *     - For CAPITAL withdrawals: contract.state → WITHDRAWN
 *     - Audit log entry created
 *
 *   Note: SYSTEM_SUSPENSE represents funds that have physically left
 *   the platform wallet. It should net to zero once confirmed on-chain.
 *   The admin marks the tx hash separately after sending.
 *
 * On REJECT:
 *   Post WITHDRAWAL_REJECTED ledger tx:
 *     DR  PLATFORM_WITHDRAWAL_RESERVE   (reverse staging)
 *     CR  USER_WALLET                   (return funds)
 *   Then:
 *     - withdrawal.status → REJECTED
 *     - available_balance cache restored
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/supabase/server";
import { adminClient, postLedgerTransaction } from "@/lib/ledger";

export async function POST(req: NextRequest) {
  // 1. Auth
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Verify admin (user_id column, not id)
  const { data: adminRow, error: adminErr } = await adminClient
    .from("wc_admins")
    .select("id, role, is_active")
    .eq("user_id", user.id)
    .single();

  if (adminErr || !adminRow || !adminRow.is_active) {
    return NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 });
  }

  if (!["SUPER_ADMIN", "FINANCE"].includes(adminRow.role)) {
    return NextResponse.json(
      { error: "Forbidden: FINANCE or SUPER_ADMIN role required" },
      { status: 403 }
    );
  }

  // 3. Parse body
  let body: {
    withdrawal_id: string;
    action: "approve" | "reject";
    fee_amount?: string;         // optional fee deducted at approval (default 0)
    tx_hash?: string;            // on-chain tx hash if already sent
    rejection_reason?: string;
    admin_notes?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { withdrawal_id, action, fee_amount = "0", tx_hash, rejection_reason, admin_notes } = body;

  if (!withdrawal_id || !action) {
    return NextResponse.json(
      { error: "withdrawal_id and action ('approve' | 'reject') are required" },
      { status: 400 }
    );
  }
  if (action === "reject" && !rejection_reason) {
    return NextResponse.json(
      { error: "rejection_reason is required when rejecting" },
      { status: 400 }
    );
  }

  // 4. Fetch withdrawal
  const { data: withdrawal, error: wErr } = await adminClient
    .from("wc_withdrawals")
    .select("id, user_id, withdrawal_type, amount, currency, status, contract_id, fee_amount, net_payout")
    .eq("id", withdrawal_id)
    .single();

  if (wErr || !withdrawal) {
    return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
  }
  if (withdrawal.status !== "PENDING") {
    return NextResponse.json(
      { error: `Withdrawal is '${withdrawal.status}' — only PENDING withdrawals can be actioned` },
      { status: 409 }
    );
  }

  const now = new Date();
  const totalAmount = Number(withdrawal.amount);
  const feeNum = Number(fee_amount);

  if (isNaN(feeNum) || feeNum < 0 || feeNum > totalAmount) {
    return NextResponse.json(
      { error: `fee_amount must be between 0 and ${Number(totalAmount).toFixed(8)}` },
      { status: 400 }
    );
  }

  const netPayout = (totalAmount - feeNum).toFixed(8);
  const feeStr = Number(feeNum).toFixed(8);
  const totalStr = Number(totalAmount).toFixed(8);

  // ── REJECT ────────────────────────────────────────────────────────────────
  if (action === "reject") {
    try {
      // WITHDRAWAL_REJECTED: DR PLATFORM_WITHDRAWAL_RESERVE / CR USER_WALLET
      await postLedgerTransaction({
        entryType: "WITHDRAWAL_REJECTED",
        userId: withdrawal.user_id,
        contractId: withdrawal.contract_id ?? undefined,
        description: `Withdrawal rejected — ${totalStr} returned to wallet. Reason: ${rejection_reason}`,
        amount: Number(totalStr).toFixed(8),
        currency: withdrawal.currency,
        idempotencyKey: `withdrawal_rejected_${withdrawal_id}`,
        initiatedBy: user.id,
        adminNotes: admin_notes,
        lines: [
          {
            accountType: "PLATFORM_WITHDRAWAL_RESERVE",
            direction: "DEBIT",
            amount: Number(totalStr).toFixed(8),
            userId: undefined,
          },
          {
            accountType: "USER_WALLET",
            direction: "CREDIT",
            amount: Number(totalStr).toFixed(8),
            userId: withdrawal.user_id,
          },
        ],
      });

      await adminClient.from("wc_withdrawals").update({
        status: "REJECTED",
        rejection_reason,
        reviewed_by: user.id,
        reviewed_at: now.toISOString(),
        notes: admin_notes ?? null,
      }).eq("id", withdrawal_id);

      // Restore available_balance cache
      await adminClient.rpc("increment_available_balance", {
        p_user_id: withdrawal.user_id,
        p_amount: Number(totalStr),
      }).then(({ error }) => {
        if (error) console.error("Balance cache restore failed (non-fatal):", error.message);
      });

      // Audit log
      await adminClient.from("wc_admin_audit_log").insert({
        admin_id: adminRow.id,
        action_type: "REJECT_WITHDRAWAL",
        target_user_id: withdrawal.user_id,
        target_withdrawal_id: withdrawal_id,
        before_state: { status: "PENDING" },
        after_state: { status: "REJECTED" },
        reason: rejection_reason!,
      });

      return NextResponse.json({
        message: "Withdrawal rejected. Funds returned to user wallet.",
        withdrawal_id,
        returned_amount: Number(totalStr).toFixed(8),
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Unexpected error during rejection" },
        { status: 500 }
      );
    }
  }

  // ── APPROVE ───────────────────────────────────────────────────────────────
  try {
    // Build ledger lines
    // DR PLATFORM_WITHDRAWAL_RESERVE (full amount)
    // CR PLATFORM_REVENUE (fee, if any)
    // CR SYSTEM_SUSPENSE (net payout — represents funds leaving platform)
    const lines: Parameters<typeof postLedgerTransaction>[0]["lines"] =
      feeNum > 0
        ? [
            {
              accountType: "PLATFORM_WITHDRAWAL_RESERVE",
              direction: "DEBIT",
              amount: Number(totalStr).toFixed(8),
              userId: undefined,
            },
            {
              accountType: "PLATFORM_REVENUE",
              direction: "CREDIT",
              amount: Number(feeStr).toFixed(8),
              userId: undefined,
            },
            {
              accountType: "SYSTEM_SUSPENSE",
              direction: "CREDIT",
              amount: Number(netPayout).toFixed(8),
              userId: undefined,
            },
          ]
        : [
            {
              accountType: "PLATFORM_WITHDRAWAL_RESERVE",
              direction: "DEBIT",
              amount: Number(totalStr).toFixed(8),
              userId: undefined,
            },
            {
              accountType: "SYSTEM_SUSPENSE",
              direction: "CREDIT",
              amount: Number(totalStr).toFixed(8),
              userId: undefined,
            },
          ];

    const { transactionId } = await postLedgerTransaction({
      entryType: "WITHDRAWAL_APPROVED",
      userId: withdrawal.user_id,
      contractId: withdrawal.contract_id ?? undefined,
      description: `Withdrawal approved — ${netPayout} ${withdrawal.currency} payout${feeNum > 0 ? ` (fee: ${feeStr})` : ""}`,
      amount: Number(totalStr).toFixed(8),
      currency: withdrawal.currency,
      idempotencyKey: `withdrawal_approved_${withdrawal_id}`,
      initiatedBy: user.id,
      adminNotes: admin_notes,
      lines,
    });

    // Update withdrawal record
    await adminClient.from("wc_withdrawals").update({
      status: "APPROVED",
        fee_amount: Number(feeNum),
      reviewed_by: user.id,
      reviewed_at: now.toISOString(),
      notes: tx_hash
        ? `On-chain tx: ${tx_hash}${admin_notes ? ` | ${admin_notes}` : ""}`
        : admin_notes ?? null,
      ledger_tx_id: transactionId,
      metadata: tx_hash ? { payout_tx_hash: tx_hash } : {},
    }).eq("id", withdrawal_id);

    // For CAPITAL withdrawals — transition contract to WITHDRAWN (terminal state)
    if (withdrawal.withdrawal_type === "CAPITAL" && withdrawal.contract_id) {
      await adminClient.from("wc_contracts").update({
        state: "WITHDRAWN",
        withdrawn_at: now.toISOString(),
        closure_ledger_tx_id: transactionId,
      }).eq("id", withdrawal.contract_id);
    }

    // Audit log
    await adminClient.from("wc_admin_audit_log").insert({
      admin_id: adminRow.id,
      action_type: "APPROVE_WITHDRAWAL",
      target_user_id: withdrawal.user_id,
      target_withdrawal_id: withdrawal_id,
      target_contract_id: withdrawal.contract_id ?? null,
      before_state: { status: "PENDING" },
      after_state: { status: "APPROVED", net_payout: netPayout, fee: feeStr },
      reason: admin_notes ?? "Withdrawal approved by admin",
      ledger_tx_id: transactionId,
    });

    return NextResponse.json({
      message: "Withdrawal approved.",
      withdrawal: {
        id: withdrawal_id,
        status: "APPROVED",
        gross_amount: Number(totalStr).toFixed(8),
        fee: feeStr,
        net_payout: netPayout,
        currency: withdrawal.currency,
      },
      ledger_transaction_id: transactionId,
    });
  } catch (err) {
    console.error("Withdrawal approval error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error during approval" },
      { status: 500 }
    );
  }
}
