/**
 * lib/ledger.ts
 * Core double-entry ledger posting utility.
 * Account names, column names, and enum values match wertchain_schema.sql exactly.
 *
 * Chart of accounts (account_type enum from schema):
 *   USER_WALLET                  – user available balance
 *   USER_CAPITAL_LOCKED          – capital in active contract
 *   USER_CAPITAL_PENDING_RELEASE – capital in release queue
 *   USER_PROFIT_PENDING          – accrued profit not yet credited
 *   PLATFORM_REVENUE             – platform earned fees
 *   PLATFORM_PROFIT_LIABILITY    – platform owes users in profit
 *   PLATFORM_WITHDRAWAL_RESERVE  – staged for withdrawal payout
 *   PLATFORM_MIGRATION_RESERVE   – capital in transit during migration
 *   PLATFORM_DEPOSIT_CLEARING    – deposits pending admin approval
 *   SYSTEM_ADJUSTMENT            – manual correction control account
 *   SYSTEM_SUSPENSE              – temporary holding (must net zero EOD)
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/supabase/types";

// Service-role client — bypasses RLS for trusted server-side ledger writes.
// NEVER expose this client to the browser.
export const adminClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// Exact values from account_type enum in schema
export type AccountType =
  | "USER_WALLET"
  | "USER_CAPITAL_LOCKED"
  | "USER_CAPITAL_PENDING_RELEASE"
  | "USER_PROFIT_PENDING"
  | "PLATFORM_REVENUE"
  | "PLATFORM_PROFIT_LIABILITY"
  | "PLATFORM_WITHDRAWAL_RESERVE"
  | "PLATFORM_MIGRATION_RESERVE"
  | "PLATFORM_DEPOSIT_CLEARING"
  | "SYSTEM_ADJUSTMENT"
  | "SYSTEM_SUSPENSE";

// Exact values from ledger_entry_type enum in schema
export type LedgerEntryType =
  | "DEPOSIT"
  | "DEPOSIT_REJECTED"
  | "INVESTMENT_CREATION"
  | "PROFIT_ACCRUAL"
  | "PROFIT_CREDIT"
  | "WITHDRAWAL_REQUEST"
  | "WITHDRAWAL_APPROVED"
  | "WITHDRAWAL_REJECTED"
  | "CAPITAL_RELEASE"
  | "CAPITAL_WITHDRAWAL"
  | "MIGRATION_DEBIT"
  | "MIGRATION_CREDIT"
  | "AUTO_REINVEST"
  | "MANUAL_REINVEST"
  | "TOP_UP"
  | "ADMIN_ADJUSTMENT"
  | "REFUND"
  | "BONUS"
  | "PENALTY"
  | "PLATFORM_FEE"
  | "REVERSAL";

export interface LedgerLine {
  accountType: AccountType;
  direction: "DEBIT" | "CREDIT";
  amount: string;        // always string — never pass a float
  userId?: string;       // required for user-side accounts, null for platform accounts
}

export interface PostLedgerArgs {
  entryType: LedgerEntryType;
  userId: string;        // the user this transaction belongs to
  contractId?: string;
  depositId?: string;
  withdrawalId?: string;
  migrationId?: string;
  description: string;   // required by schema — human-readable summary
  amount: string;        // total transaction amount (debit side sum)
  currency?: string;
  idempotencyKey: string;
  initiatedBy?: string;  // admin user id for admin actions
  adminNotes?: string;
  lines: [LedgerLine, LedgerLine, ...LedgerLine[]]; // minimum 2
}

export async function postLedgerTransaction(
  args: PostLedgerArgs
): Promise<{ transactionId: string }> {
  const {
    entryType, userId, contractId, depositId, withdrawalId, migrationId,
    description, amount, currency = "USD", idempotencyKey,
    initiatedBy, adminNotes, lines,
  } = args;

  // Idempotency — return existing tx if already posted
  const { data: existing } = await adminClient
    .from("wc_ledger_transactions")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existing) return { transactionId: existing.id };

  // Validate double-entry balance before hitting the DB
  const debitSum = lines
    .filter((l) => l.direction === "DEBIT")
    .reduce((s, l) => s + parseFloat(l.amount), 0);
  const creditSum = lines
    .filter((l) => l.direction === "CREDIT")
    .reduce((s, l) => s + parseFloat(l.amount), 0);

  if (Math.abs(debitSum - creditSum) > 0.00000001) {
    throw new Error(
      `Double-entry imbalance: DEBIT ${debitSum} ≠ CREDIT ${creditSum}`
    );
  }

  // Insert transaction header — column names match schema exactly
  const { data: tx, error: txError } = await adminClient
    .from("wc_ledger_transactions")
    .insert({
      entry_type: entryType,
      user_id: userId,
      contract_id: contractId ?? null,
      deposit_id: depositId ?? null,
      withdrawal_id: withdrawalId ?? null,
      migration_id: migrationId ?? null,
      description,
      amount: parseFloat(amount),
      currency,
      idempotency_key: idempotencyKey,
      initiated_by: initiatedBy ?? null,
      admin_notes: adminNotes ?? null,
      effective_date: new Date().toISOString().split("T")[0],
    })
    .select("id")
    .single();

  if (txError || !tx) {
    throw new Error(`Ledger transaction insert failed: ${txError?.message}`);
  }

  // Insert ledger lines — sequence_num is required by schema
  const entryRows = lines.map((line, idx) => ({
    transaction_id: tx.id,
    account_type: line.accountType,
    user_id: line.userId ?? null,
    direction: line.direction,
    amount: parseFloat(line.amount),
    currency,
    sequence_num: idx + 1,
  }));

  const { error: linesError } = await adminClient
    .from("wc_ledger_entries")
    .insert(entryRows);

  if (linesError) {
    // The ledger_transactions immutability trigger will block deletion,
    // so log the orphan — a reconciliation run will catch it.
    console.error(
      `CRITICAL: Ledger entries failed for tx ${tx.id}:`,
      linesError.message
    );
    throw new Error(`Ledger entries insert failed: ${linesError.message}`);
  }

  return { transactionId: tx.id };
}
