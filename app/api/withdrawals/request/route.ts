/**
 * POST /api/withdrawals/request
 *
 * User requests a withdrawal of profit or released capital.
 *
 * Two withdrawal types (matches schema CHECK constraint):
 * PROFIT  — from USER_WALLET (profit credited at maturity)
 * CAPITAL — from USER_WALLET (capital after RELEASED state)
 *
 * Both types debit USER_WALLET because by the time a user can withdraw:
 * - Profit has already been credited to USER_WALLET at maturity (PROFIT_CREDIT tx)
 * - Capital has already been moved to USER_WALLET via CAPITAL_RELEASE tx
 *
 * Flow:
 * 1. Validate user has sufficient available_balance in wc_wallet_balances
 * 2. For CAPITAL withdrawals — verify linked contract is in RELEASED state
 * 3. Post WITHDRAWAL_REQUEST ledger tx:
 * DR  USER_WALLET                  (debit available)
 * CR  PLATFORM_WITHDRAWAL_RESERVE  (stage for payout)
 * 4. Decrement available_balance cache
 * 5. Create wc_withdrawals record in PENDING state
 * 6. Admin then approves or rejects via /api/admin/withdrawals/approve
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/supabase/server";
import { adminClient, postLedgerTransaction } from "@/lib/ledger";

export async function POST(req: NextRequest) {
  // 1. Auth
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse body
  let body: {
    withdrawal_type: "PROFIT" | "CAPITAL";
    amount: string;
    currency?: string;
    destination_details: {
      wallet_address: string;
      network: string;       // e.g. "TRC20", "ERC20", "BTC"
    };
    contract_id?: string;    // required for CAPITAL withdrawals
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    withdrawal_type,
    amount,
    currency = "USD",
    destination_details,
    contract_id,
  } = body;

  if (!withdrawal_type || !amount || !destination_details) {
    return NextResponse.json(
      { error: "withdrawal_type, amount, and destination_details are required" },
      { status: 400 }
    );
  }

  if (!["PROFIT", "CAPITAL"].includes(withdrawal_type)) {
    return NextResponse.json(
      { error: "withdrawal_type must be 'PROFIT' or 'CAPITAL'" },
      { status: 400 }
    );
  }

  if (!destination_details.wallet_address || !destination_details.network) {
    return NextResponse.json(
      { error: "destination_details must include wallet_address and network" },
      { status: 400 }
    );
  }

  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    return NextResponse.json(
      { error: "amount must be a positive number" },
      { status: 400 }
    );
  }

  if (withdrawal_type === "CAPITAL" && !contract_id) {
    return NextResponse.json(
      { error: "contract_id is required for CAPITAL withdrawals" },
      { status: 400 }
    );
  }

  // 3. Verify user account
  const { data: userData } = await adminClient
    .from("wc_users")
    .select("id, is_active, is_suspended, kyc_status")
    .eq("id", user.id)
    .single();

  if (!userData || !userData.is_active || userData.is_suspended) {
    return NextResponse.json(
      { error: "Account is not active. Contact support." },
      { status: 403 }
    );
  }

  // 4. Check available balance (cache — source of truth is ledger but cache is fast)
  const { data: wallet } = await adminClient
    .from("wc_wallet_balances")
    .select("available_balance")
    .eq("user_id", user.id)
    .single();

  if (!wallet) {
    return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
  }

  const availableBalance = parseFloat(wallet.available_balance);
  if (amountNum > availableBalance) {
    return NextResponse.json(
      {
        error: `Insufficient available balance. Available: ${availableBalance.toFixed(8)}, Requested: ${amountNum.toFixed(8)}`,
      },
      { status: 400 }
    );
  }

  // 5. For CAPITAL withdrawals — verify contract is RELEASED
  if (withdrawal_type === "CAPITAL" && contract_id) {
    const { data: contract } = await adminClient
      .from("wc_contracts")
      .select("id, state, user_id, principal_amount")
      .eq("id", contract_id)
      .single();

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }
    if (contract.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (contract.state !== "RELEASED") {
      return NextResponse.json(
        {
          error: `Contract is in '${contract.state}' state. Capital can only be withdrawn after the contract reaches RELEASED state.`,
        },
        { status: 400 }
      );
    }
    // Amount must match contract principal exactly for capital withdrawals
    const principalAmount = parseFloat(contract.principal_amount);
    if (Math.abs(amountNum - principalAmount) > 0.00000001) {
      return NextResponse.json(
        {
          error: `Capital withdrawal amount must match contract principal exactly: ${principalAmount.toFixed(8)}`,
        },
        { status: 400 }
      );
    }
  }

  const amountStr = amountNum.toFixed(8);

  try {
    // 6. Post WITHDRAWAL_REQUEST ledger tx
    //    DR USER_WALLET / CR PLATFORM_WITHDRAWAL_RESERVE
    const { transactionId } = await postLedgerTransaction({
      entryType: "WITHDRAWAL_REQUEST",
      userId: user.id,
      contractId: contract_id,
      description: `Withdrawal request — ${withdrawal_type} ${amountStr} ${currency} to ${destination_details.network} wallet`,
      amount: amountStr,
      currency,
      idempotencyKey: `withdrawal_request_${user.id}_${Date.now()}`,
      lines: [
        {
          accountType: "USER_WALLET",
          direction: "DEBIT",
          amount: amountStr,
          userId: user.id,
        },
        {
          accountType: "PLATFORM_WITHDRAWAL_RESERVE",
          direction: "CREDIT",
          amount: amountStr,
          userId: undefined,   // platform account
        },
      ],
    });

    // 7. Create withdrawal record
    const { data: withdrawal, error: withdrawalErr } = await adminClient
      .from("wc_withdrawals")
      .insert({
        user_id: user.id,
        withdrawal_type,
        amount: amountStr,
        currency,
        destination_details,
        status: "PENDING",
        fee_amount: "0.00000000",   // fee calculated at approval time
        contract_id: contract_id ?? null,
        ledger_tx_id: transactionId,
        notes: `Requested via API — ${withdrawal_type} withdrawal`,
      })
      .select("id, status, created_at")
      .single();

    if (withdrawalErr || !withdrawal) {
      throw new Error(`Failed to create withdrawal record: ${withdrawalErr?.message}`);
    }

    // 8. Decrement available_balance cache
    await adminClient.rpc("decrement_available_balance", {
      p_user_id: user.id,
      p_amount: amountStr,
    }).then(({ error }) => {
      if (error) console.error("available_balance cache decrement failed (non-fatal):", error.message);
    });

    return NextResponse.json(
      {
        message: "Withdrawal request submitted. Awaiting admin approval.",
        withdrawal: {
          id: withdrawal.id,
          type: withdrawal_type,
          amount: amountStr,
          currency,
          destination: destination_details,
          status: withdrawal.status,
          created_at: withdrawal.created_at,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Withdrawal request error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
