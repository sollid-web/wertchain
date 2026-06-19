/**
 * GET /api/cron/accrue-profit
 *
 * Daily profit accrual cron job.
 * Must be called once per day — idempotent if called multiple times on the same date.
 *
 * For each ACTIVE contract that has not yet been accrued today:
 *   1. Calculate today's profit slice
 *   2. Post PROFIT_ACCRUAL ledger transaction:
 *        DR  PLATFORM_PROFIT_LIABILITY   (platform owes more profit)
 *        CR  USER_PROFIT_PENDING         (user's accruing profit)
 *   3. Insert wc_profit_accrual_log row (unique constraint prevents double-post)
 *   4. Update contract.profit_credited running total
 *   5. If this is the final day → trigger maturity processing
 *
 * Maturity processing (final day):
 *   Post PROFIT_CREDIT transaction:
 *        DR  USER_PROFIT_PENDING         (clear all pending profit)
 *        CR  USER_WALLET                 (credit to available balance)
 *   Then transition contract.state to AUTO_REINVESTED or RELEASE_QUEUE.
 *
 * Security: protected by CRON_SECRET header.
 * Schedule: daily at 00:05 UTC via Vercel Cron (vercel.json) or external scheduler.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminClient, postLedgerTransaction } from "@/lib/ledger";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  // 1. Auth
  const authHeader = req.headers.get("authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];
  const jobName = "daily_profit_accrual";

  // 2. Idempotency — skip if already succeeded today
  const { data: existingRun } = await adminClient
    .from("wc_cron_job_runs")
    .select("id, status")
    .eq("job_name", jobName)
    .eq("run_date", today)
    .maybeSingle();

  if (existingRun?.status === "SUCCESS") {
    return NextResponse.json({ message: `Already completed for ${today}`, skipped: true });
  }

  // 3. Log job start
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

  // 4. Fetch all ACTIVE, not-yet-fully-credited contracts
  const { data: contracts, error: contractsErr } = await adminClient
    .from("wc_contracts")
    .select("id, user_id, principal_amount, expected_profit, daily_profit_amount, duration_days_snapshot, profit_credited, profit_fully_credited, auto_reinvest, maturity_date, activated_at, release_delay_days, release_eligible_date")
    .eq("state", "ACTIVE")
    .eq("profit_fully_credited", false);

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
    return NextResponse.json({ message: "No active contracts", processed: 0 });
  }

  let processed = 0;
  let failed = 0;
  const errors: { contractId: string; error: string }[] = [];

  for (const contract of contracts) {
    try {
      // Check if already accrued today via profit_accrual_log unique constraint
      const { data: existingAccrual } = await adminClient
        .from("wc_profit_accrual_log")
        .select("id")
        .eq("contract_id", contract.id)
        .eq("accrual_date", today)
        .maybeSingle();

      if (existingAccrual) {
        processed++;
        continue;
      }

      // Calculate day number (day 1 = first day after activation date)
      const activatedAt = new Date(contract.activated_at!);
      activatedAt.setHours(0, 0, 0, 0);
      const todayDate = new Date(today);
      const dayNumber = Math.floor(
        (todayDate.getTime() - activatedAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Day 0 = activation day itself, skip — first accrual is day 1
      if (dayNumber < 1) {
        processed++;
        continue;
      }

      const totalDays = contract.duration_days_snapshot;
      const isFinalDay = dayNumber >= totalDays;
      const profitCredited = Number(contract.profit_credited);
      const expectedProfit = Number(contract.expected_profit);
      const dailyAmount = Number(contract.daily_profit_amount);

      // Final day uses remainder formula to avoid rounding drift accumulation
      const todayAmount = isFinalDay
        ? Math.max(0, expectedProfit - profitCredited)
        : dailyAmount;

      if (todayAmount <= 0) {
        processed++;
        continue;
      }

      const todayAmountStr = todayAmount.toFixed(8);

      // Post PROFIT_ACCRUAL
      const { transactionId } = await postLedgerTransaction({
        entryType: "PROFIT_ACCRUAL",
        userId: contract.user_id,
        contractId: contract.id,
        description: `Profit accrual day ${dayNumber}/${totalDays} — contract ${contract.id}`,
        amount: todayAmount.toFixed(8),
        idempotencyKey: `profit_accrual_${contract.id}_${today}`,
        lines: [
          {
            accountType: "PLATFORM_PROFIT_LIABILITY",
            direction: "DEBIT",
            amount: todayAmount.toFixed(8),
            userId: undefined,
          },
          {
            accountType: "USER_PROFIT_PENDING",
            direction: "CREDIT",
            amount: todayAmount.toFixed(8),
            userId: contract.user_id,
          },
        ],
      });

      // Record in accrual log (unique constraint = natural idempotency guard)
      await adminClient.from("wc_profit_accrual_log").insert({
        contract_id: contract.id,
        user_id: contract.user_id,
        accrual_date: today,
        day_number: dayNumber,
        amount: todayAmount,
        ledger_tx_id: transactionId,
      });

      const newProfitCredited = profitCredited + todayAmount;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contractUpdate: Record<string, any> = {
        profit_credited: newProfitCredited,
      };

      // Maturity processing on final day
      if (isFinalDay) {
        contractUpdate.profit_fully_credited = true;
        contractUpdate.matured_at = new Date().toISOString();

        // PROFIT_CREDIT: move all pending profit → USER_WALLET
        const totalPending = Number(newProfitCredited);
        if (totalPending > 0) {
          await postLedgerTransaction({
            entryType: "PROFIT_CREDIT",
            userId: contract.user_id,
            contractId: contract.id,
            description: `Profit credited at maturity — ${totalPending.toFixed(8)} to wallet`,
            amount: totalPending.toFixed(8),
            idempotencyKey: `profit_credit_maturity_${contract.id}`,
            lines: [
              {
                accountType: "USER_PROFIT_PENDING",
                direction: "DEBIT",
                amount: totalPending.toFixed(8),
                userId: contract.user_id,
              },
              {
                accountType: "USER_WALLET",
                direction: "CREDIT",
                amount: totalPending.toFixed(8),
                userId: contract.user_id,
              },
            ],
          });

          // Update available_balance cache
          await adminClient.rpc("increment_available_balance", {
            p_user_id: contract.user_id,
            p_amount: totalPending,
          }).then(({ error }) => {
            if (error) {
              console.error(`available_balance cache failed for ${contract.user_id}:`, error.message);
            }
          });
        }

        // Transition state — AUTO_REINVESTED or RELEASE_QUEUE
        contractUpdate.state = contract.auto_reinvest ? "AUTO_REINVESTED" : "RELEASE_QUEUE";
      }

      await adminClient.from("wc_contracts").update(contractUpdate as any).eq("id", contract.id);
      processed++;
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push({ contractId: contract.id, error: msg });
      console.error(`Accrual failed for contract ${contract.id}:`, msg);
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
