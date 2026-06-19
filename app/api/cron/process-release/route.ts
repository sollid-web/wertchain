/**
 * GET /api/cron/process-release
 *
 * Daily cron — processes contracts in RELEASE_QUEUE whose release delay has elapsed.
 *
 * A contract enters RELEASE_QUEUE when:
 *   - It matured AND auto_reinvest = false
 *   - Admin force-cancelled it (capital goes into release delay)
 *
 * When release_eligible_date <= today:
 *   1. Post CAPITAL_RELEASE ledger tx:
 *        DR  USER_CAPITAL_PENDING_RELEASE  (exit release queue)
 *        CR  USER_WALLET                   (capital now available)
 *   2. contract.state → RELEASED
 *   3. Increment available_balance cache
 *
 * Note: The schema does not have a USER_CAPITAL_PENDING_RELEASE balance
 * column in wc_wallet_balances — only pending_release_capital.
 * We use that for the cache, and decrement locked_capital at the same time.
 *
 * Schedule: daily at 00:10 UTC (after profit accrual at 00:05)
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
  const jobName = "process_capital_release";

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

  // Fetch RELEASE_QUEUE contracts whose delay has elapsed
  const { data: contracts, error: contractsErr } = await adminClient
    .from("wc_contracts")
    .select("id, user_id, principal_amount, release_eligible_date")
    .eq("state", "RELEASE_QUEUE")
    .lte("release_eligible_date", today);   // release_eligible_date <= today

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
    return NextResponse.json({ message: "No contracts ready for release", processed: 0 });
  }

  let processed = 0;
  let failed = 0;
  const errors: { contractId: string; error: string }[] = [];

  for (const contract of contracts) {
    try {
      const principalStr = Number(contract.principal_amount).toFixed(8);

      // Post CAPITAL_RELEASE: DR USER_CAPITAL_PENDING_RELEASE / CR USER_WALLET
      await postLedgerTransaction({
        entryType: "CAPITAL_RELEASE",
        userId: contract.user_id,
        contractId: contract.id,
        description: `Capital released — ${principalStr} available for withdrawal (contract ${contract.id})`,
        amount: principalStr,
        idempotencyKey: `capital_release_${contract.id}`,
        lines: [
          {
            accountType: "USER_CAPITAL_PENDING_RELEASE",
            direction: "DEBIT",
            amount: principalStr,
            userId: contract.user_id,
          },
          {
            accountType: "USER_WALLET",
            direction: "CREDIT",
            amount: principalStr,
            userId: contract.user_id,
          },
        ],
      });

      // Transition contract to RELEASED
      await adminClient.from("wc_contracts").update({
        state: "RELEASED",
        released_at: new Date().toISOString(),
      }).eq("id", contract.id);

      // Update wallet cache:
      // pending_release_capital -= principal
      // available_balance += principal
      await adminClient.rpc("process_capital_release_balances", {
        p_user_id: contract.user_id,
        p_amount: Number(principalStr),
      }).then(({ error }) => {
        if (error) console.error(`Wallet cache update failed for ${contract.user_id}:`, error.message);
      });

      processed++;
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push({ contractId: contract.id, error: msg });
      console.error(`Capital release failed for contract ${contract.id}:`, msg);
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
