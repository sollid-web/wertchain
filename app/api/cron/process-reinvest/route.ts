/**
 * GET /api/cron/process-reinvest
 *
 * Daily cron — creates new contracts for AUTO_REINVESTED contracts.
 *
 * A contract enters AUTO_REINVESTED state when:
 * - It matured AND auto_reinvest = true
 * (set by the profit accrual cron on final day)
 *
 * For each AUTO_REINVESTED contract without a child contract yet:
 * 1. Create new contract on the same plan (same tier, same principal)
 * 2. Post AUTO_REINVEST ledger tx:
 * DR  USER_CAPITAL_LOCKED   (close old contract capital)
 * CR  USER_CAPITAL_LOCKED   (open new contract capital)
 * These net to zero — capital stays locked, just in a new contract.
 * 3. Set parent_contract_id on new contract for lineage tracking
 * 4. Old contract closure_ledger_tx_id updated
 *
 * Schedule: daily at 00:15 UTC (after profit accrual and release processing)
 */

import { NextRequest, NextResponse } from "next/server";
import { adminClient, postLedgerTransaction } from "@/lib/ledger";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];
  const jobName = "process_auto_reinvest";

  // Idempotency check
  const { data: existingRun } = await adminClient
    .from("wc_cron_job_runs")
    .select("id, status")
    .eq("job_name", jobName)
    .eq("run_date", today)
    .maybeSingle();

  if (existingRun?.status === "SUCCESS") {
    return NextResponse.json({ message: `Already completed for ${today}`, skipped: true });
  }

  // Log job start
  const { data: jobRun, error: jobRunErr } = await adminClient
    .from("wc_cron_job_runs")
    .upsert(
      {
        job_name: jobName,
        run_date: today,
        started_at: new Date().toISOString(),
        status: "RUNNING",
        records_processed: 0,
        records_failed: 0,
      },
      { onConflict: "job_name,run_date" }
    )
    .select("id")
    .single();

  if (jobRunErr || !jobRun) {
    return NextResponse.json({ error: "Failed to initialise job run" }, { status: 500 });
  }

  // Fetch AUTO_REINVESTED contracts that don't yet have a child contract
  // We detect "no child" by checking wc_contracts for rows with parent_contract_id = this contract's id
  const { data: contracts, error: contractsErr } = await adminClient
    .from("wc_contracts")
    .select(`
      id,
      user_id,
      plan_id,
      plan_tier,
      principal_amount,
      profit_rate_snapshot,
      duration_days_snapshot,
      release_delay_days,
      matured_at
    `)
    .eq("state", "AUTO_REINVESTED");

  if (contractsErr) {
    await adminClient.from("wc_cron_job_runs").update({
      status: "FAILED",
      completed_at: new Date().toISOString(),
      error_details: { message: contractsErr.message },
    }).eq("id", jobRun.id);
    return NextResponse.json({ error: "Failed to fetch contracts" }, { status: 500 });
  }

  if (!contracts || contracts.length === 0) {
    await adminClient.from("wc_cron_job_runs").update({
      status: "SUCCESS",
      completed_at: new Date().toISOString(),
      records_processed: 0,
    }).eq("id", jobRun.id);
    return NextResponse.json({ message: "No contracts to reinvest", processed: 0 });
  }

  let processed = 0;
  let failed = 0;
  const errors: { contractId: string; error: string }[] = [];

  for (const contract of contracts) {
    try {
      // Check if a child contract already exists (idempotency)
      const { data: existingChild } = await adminClient
        .from("wc_contracts")
        .select("id")
        .eq("parent_contract_id", contract.id)
        .maybeSingle();

      if (existingChild) {
        processed++;
        continue;
      }

      // Fetch current plan details to recalculate financials
      // (profit_rate may have changed — use snapshot from parent to honour original rate)
      const principal = parseFloat(contract.principal_amount);
      const profitRate = parseFloat(contract.profit_rate_snapshot);
      const durationDays = contract.duration_days_snapshot;
      const dailyProfitAmount = (principal * profitRate) / durationDays;
      const expectedProfit = principal * profitRate;

      // Activation dates for new contract
      const now = new Date();
      const startDate = now.toISOString().split("T")[0];
      const maturityDate = new Date(now);
      maturityDate.setDate(maturityDate.getDate() + durationDays);
      const maturityDateStr = maturityDate.toISOString().split("T")[0];
      const releaseDate = new Date(maturityDate);
      releaseDate.setDate(releaseDate.getDate() + (contract.release_delay_days ?? 0));
      const releaseDateStr = releaseDate.toISOString().split("T")[0];

      const principalStr = principal.toFixed(8);

      // Post AUTO_REINVEST ledger tx
      // DR USER_CAPITAL_LOCKED (old contract) / CR USER_CAPITAL_LOCKED (new contract)
      // Both entries use the same account_type — the contract_id on the transaction
      // is what distinguishes them in the ledger trail.
      // We post the debit against the old contract, then the credit against the new one.
      // Since we need the new contract id first, we create the contract before the ledger tx.

      // Create new contract (state=ACTIVE immediately — no deposit needed for reinvest)
      const { data: newContract, error: newContractErr } = await adminClient
        .from("wc_contracts")
        .insert({
          user_id: contract.user_id,
          plan_id: contract.plan_id,
          plan_tier: contract.plan_tier,
          principal_amount: principalStr,
          expected_profit: expectedProfit.toFixed(8),
          daily_profit_amount: dailyProfitAmount.toFixed(8),
          profit_rate_snapshot: profitRate.toFixed(6),
          duration_days_snapshot: durationDays,
          state: "ACTIVE",
          auto_reinvest: true,
          release_delay_days: contract.release_delay_days,
          activated_at: now.toISOString(),
          maturity_date: maturityDateStr,
          release_eligible_date: releaseDateStr,
          parent_contract_id: contract.id,
          origin_type: "AUTO_REINVEST",
        })
        .select("id")
        .single();

      if (newContractErr || !newContract) {
        throw new Error(`Failed to create reinvest contract: ${newContractErr?.message}`);
      }

      // Post ledger transaction — two entries, both USER_CAPITAL_LOCKED
      // transaction references old contract; description identifies new one
      const { transactionId } = await postLedgerTransaction({
        entryType: "AUTO_REINVEST",
        userId: contract.user_id,
        contractId: contract.id,              // old contract
        description: `Auto-reinvest — capital rolled from contract ${contract.id} into new contract ${newContract.id}`,
        amount: principalStr,
        idempotencyKey: `auto_reinvest_${contract.id}`,
        lines: [
          {
            accountType: "USER_CAPITAL_LOCKED",
            direction: "DEBIT",
            amount: principalStr,
            userId: contract.user_id,
          },
          {
            accountType: "USER_CAPITAL_LOCKED",
            direction: "CREDIT",
            amount: principalStr,
            userId: contract.user_id,
          },
        ],
      });

      // Update old contract closure
      await adminClient.from("wc_contracts").update({
        closure_ledger_tx_id: transactionId,
      }).eq("id", contract.id);

      // Update new contract with creation ledger tx
      await adminClient.from("wc_contracts").update({
        creation_ledger_tx_id: transactionId,
      }).eq("id", newContract.id);

      processed++;
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push({ contractId: contract.id, error: msg });
      console.error(`Auto-reinvest failed for contract ${contract.id}:`, msg);
    }
  }

  const finalStatus = failed === 0 ? "SUCCESS" : processed > 0 ? "PARTIAL" : "FAILED";
  await adminClient.from("wc_cron_job_runs").update({
    status: finalStatus,
    completed_at: new Date().toISOString(),
    records_processed: processed,
    records_failed: failed,
    error_details: errors.length > 0 ? { errors } : null,
  }).eq("id", jobRun.id);

  return NextResponse.json({ date: today, status: finalStatus, processed, failed, errors: errors.length > 0 ? errors : undefined });
}
