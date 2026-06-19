/**
 * POST /api/contracts
 *
 * Creates a new investment contract for the authenticated user.
 * Contract starts in state='PENDING' (matches contract_state enum).
 *
 * What gets set here (all NOT NULL columns validated against schema):
 *   wc_contracts: user_id, plan_id, plan_tier, principal_amount,
 *     expected_profit, daily_profit_amount, profit_rate_snapshot,
 *     duration_days_snapshot, state, auto_reinvest,
 *     release_delay_days, origin_type
 *
 *   wc_deposits: user_id, amount, currency, payment_method, status
 *
 * What does NOT happen here:
 *   - No ledger entries (ledger posts on deposit approval only)
 *   - No contract activation (happens in /api/admin/deposits/approve)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/supabase/server";
import { adminClient } from "@/lib/ledger";

// Platform wallet addresses — one per supported payment method.
// Move to a wc_platform_wallets table before launch so admins can rotate without deploys.
const PLATFORM_WALLETS: Record<string, { address: string; paymentMethod: string }> = {
  USDT_TRC20: {
    address: process.env.PLATFORM_WALLET_USDT_TRC20 ?? "",
    paymentMethod: "CRYPTO_USDT_TRC20",
  },
  USDT_ERC20: {
    address: process.env.PLATFORM_WALLET_USDT_ERC20 ?? "",
    paymentMethod: "CRYPTO_USDT_ERC20",
  },
  BTC: {
    address: process.env.PLATFORM_WALLET_BTC ?? "",
    paymentMethod: "CRYPTO_BTC",
  },
};

export async function POST(req: NextRequest) {
  // 1. Authenticate
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse body
  let body: {
    plan_id: string;
    amount: string;
    currency: string;
    auto_reinvest?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { plan_id, amount, currency, auto_reinvest = true } = body;
  if (!plan_id || !amount || !currency) {
    return NextResponse.json(
      { error: "plan_id, amount, and currency are required" },
      { status: 400 }
    );
  }

  const amountNum = Number(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    return NextResponse.json(
      { error: "amount must be a positive number" },
      { status: 400 }
    );
  }

  const walletConfig = PLATFORM_WALLETS[currency];
  if (!walletConfig || !walletConfig.address) {
    return NextResponse.json(
      { error: `Unsupported currency: ${currency}. Supported: ${Object.keys(PLATFORM_WALLETS).join(", ")}` },
      { status: 400 }
    );
  }

  // 3. Fetch and validate plan
  const { data: plan, error: planError } = await adminClient
    .from("wc_investment_plans")
    .select("id, tier, label, min_amount, max_amount, duration_days, profit_rate, auto_reinvest_default, capital_release_delay_days, is_active")
    .eq("id", plan_id)
    .single();

  if (planError || !plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }
  if (!plan.is_active) {
    return NextResponse.json(
      { error: "This plan is no longer accepting new investments" },
      { status: 400 }
    );
  }
  if (amountNum < Number(plan.min_amount)) {
    return NextResponse.json(
      { error: `Minimum investment is ${plan.min_amount} for ${plan.label}` },
      { status: 400 }
    );
  }
  if (plan.max_amount && amountNum > Number(plan.max_amount)) {
    return NextResponse.json(
      { error: `Maximum investment is ${plan.max_amount} for ${plan.label}` },
      { status: 400 }
    );
  }

  // 4. Validate user account
  const { data: userData, error: userError } = await adminClient
    .from("wc_users")
    .select("id, is_active, is_suspended, kyc_status")
    .eq("id", user.id)
    .single();

  if (userError || !userData) {
    return NextResponse.json({ error: "User account not found" }, { status: 404 });
  }
  if (!userData.is_active || userData.is_suspended) {
    return NextResponse.json(
      { error: "Your account is not active. Please contact support." },
      { status: 403 }
    );
  }

  // 5. Pre-calculate all contract financials — locked at creation, immutable after ACTIVE
  const profitRate = Number(plan.profit_rate);
  const durationDays = plan.duration_days;
  // Daily slice: principal × rate ÷ duration (using full precision, rounded to 8dp)
  const dailyProfitAmount = (amountNum * profitRate) / durationDays;
  // Expected total: sum of daily slices (use direct formula to avoid accumulation drift)
  const expectedProfit = amountNum * profitRate;

  // 6. Create contract — state='PENDING', all NOT NULL columns set
  const { data: contract, error: contractError } = await adminClient
    .from("wc_contracts")
    .insert({
      user_id: user.id,
      plan_id: plan.id,
      plan_tier: plan.tier,                                    // plan_tier NOT NULL
      principal_amount: amountNum,
      expected_profit: expectedProfit,
      daily_profit_amount: Number(dailyProfitAmount),
      profit_rate_snapshot: profitRate,
      duration_days_snapshot: durationDays,                    // duration_days_snapshot NOT NULL
      state: "PENDING",                                        // contract_state enum
      auto_reinvest: auto_reinvest,
      release_delay_days: plan.capital_release_delay_days,
      origin_type: "NEW",
    })
    .select("id, state, created_at")
    .single();

  if (contractError || !contract) {
    console.error("Contract insert error:", contractError);
    return NextResponse.json(
      { error: "Failed to create contract. Please try again." },
      { status: 500 }
    );
  }

  // 7. Create deposit record linked to this contract
  //    Schema columns: amount, currency, payment_method (NOT NULL), payment_reference (tx hash — set later on submit)
  //    Store platform wallet in notes (schema has no platform_wallet_address column)
  const { data: deposit, error: depositError } = await adminClient
    .from("wc_deposits")
    .insert({
      user_id: user.id,
      amount: amountNum,
      currency,
      payment_method: walletConfig.paymentMethod,              // payment_method NOT NULL
      status: "PENDING",
      notes: `Send to platform wallet: ${walletConfig.address}`,
      metadata: {
        contract_id: contract.id,
        platform_wallet_address: walletConfig.address,
      },
    })
    .select("id, status, created_at")
    .single();

  if (depositError || !deposit) {
    // Roll back contract
    await adminClient.from("wc_contracts").delete().eq("id", contract.id);
    console.error("Deposit insert error:", depositError);
    return NextResponse.json(
      { error: "Failed to create deposit record. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      contract: {
        id: contract.id,
        state: contract.state,
        plan_name: plan.label,
        plan_tier: plan.tier,
        principal_amount: amountNum.toFixed(8),
        expected_profit: expectedProfit.toFixed(8),
        daily_profit_amount: Number(dailyProfitAmount),
        duration_days: durationDays,
        profit_rate: profitRate,
        auto_reinvest,
        created_at: contract.created_at,
      },
      deposit_instruction: {
        deposit_id: deposit.id,
        send_exactly: amountNum.toFixed(8),
        currency,
        to_address: walletConfig.address,
        payment_method: walletConfig.paymentMethod,
        status: deposit.status,
        next_step: "Submit your transaction hash via POST /api/deposits/submit after sending.",
      },
    },
    { status: 201 }
  );
}
