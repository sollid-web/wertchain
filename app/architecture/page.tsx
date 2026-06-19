import Link from "next/link";

export const metadata = {
  title: "Architectural Specifications | Wertchain Immutable Master Ledger",
  description:
    "Explore the underlying architecture of Wertchain. Technical deep-dive into double-entry accounting, SHA-256 hash chains, and core database state machines engineered for complete capital auditability.",
};

export default function ArchitecturePage() {
  return (
    <div className="bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:px-12">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Architectural Specifications</p>
          <h1 className="text-4xl font-semibold text-white sm:text-5xl">
            Immutable Master Ledger Infrastructure
          </h1>
          <blockquote className="rounded-3xl border-l-4 border-emerald-500/60 bg-slate-900/80 p-6 text-slate-200">
            <p className="text-lg leading-8">
              “Trust is a sub-optimal vector for capital preservation. The German financial tradition demands <em>Nachweisbarkeit</em>—complete verifiability.
              Wertchain replaces corporate promises with a deterministic, immutable state machine built on double-entry principles, ensuring that assets match platform liabilities down to the single smallest decimal point.”
            </p>
          </blockquote>
        </div>

        <section className="mt-14 space-y-10">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl shadow-slate-950/30">
            <h2 className="text-2xl font-semibold text-white">Double-Entry Financial Posting Map</h2>
            <p className="mt-4 text-slate-300 leading-7">
              Every capital deployment maps directly to an immutable ledger framework. This structural transparency guarantees that the sum of all debits strictly matches the sum of all credits across the entire network ecosystem.
            </p>
            <pre className="mt-6 overflow-x-auto rounded-3xl bg-slate-950/90 p-6 text-sm text-slate-200">
{`[Capital Deposit] ──> DR: PLATFORM_DEPOSIT_CLEARING  ──> CR: USER_WALLET
[Plan Activation] ──> DR: USER_WALLET               ──> CR: USER_CAPITAL_LOCKED
[Yield Accrual]   ──> DR: PLATFORM_PROFIT_LIABILITY ──> CR: USER_PROFIT_PENDING`}
            </pre>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <div className="rounded-3xl bg-slate-950/80 p-6 ring-1 ring-slate-800">
                <h3 className="text-lg font-semibold text-white">Transaction Headers</h3>
                <p className="mt-3 text-slate-300 leading-7">
                  wc_ledger_transactions collects and categorizes every system movement under an isolated, unique financial event identification key.
                </p>
              </div>
              <div className="rounded-3xl bg-slate-950/80 p-6 ring-1 ring-slate-800">
                <h3 className="text-lg font-semibold text-white">Atomic Balances</h3>
                <p className="mt-3 text-slate-300 leading-7">
                  wc_ledger_entries enforces that every internal capital movement has a balancing debit and credit. Database-level constraints reject asymmetric transactions.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl shadow-slate-950/30">
            <h2 className="text-2xl font-semibold text-white">Linear Cryptographic Tamper Detection</h2>
            <p className="mt-4 text-slate-300 leading-7">
              Wertchain adapts cryptographic security frameworks directly into the relational database environment to guarantee absolute historical persistence.
            </p>
            <ul className="mt-6 space-y-4 text-slate-300">
              <li>
                <strong className="text-white">Sequential Row Hashing:</strong> Every transaction computes an internal SHA-256 row_hash encompassing all column data.
              </li>
              <li>
                <strong className="text-white">Interlocking User Ledger Chains:</strong> Each row embeds a prev_hash reflecting the prior financial interaction, forming a parallel custody chain per participant.
              </li>
              <li>
                <strong className="text-white">Continuous Offline Reconciliation:</strong> Automated system crons scan hash integrity daily. Unauthorized modification interrupts execution and alerts administrators.
              </li>
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl shadow-slate-950/30">
            <h2 className="text-2xl font-semibold text-white">Deterministic Contract State Transitions</h2>
            <p className="mt-4 text-slate-300 leading-7">
              Wertchain investment lifecycles are governed by an ironclad database-level state machine. Contracts cannot skip steps or alter past values.
            </p>
            <pre className="mt-6 overflow-x-auto rounded-3xl bg-slate-950/90 p-6 text-sm text-slate-200">
{`  ┌───────────┐      ┌──────────┐      ┌───────────┐      ┌─────────────────┐
  │  PENDING  │ ───> │  ACTIVE  │ ───> │  MATURED  │ ───> │ AUTO_REINVESTED │
  └───────────┘      └──────────┘      └───────────┘      └─────────────────┘
                            │                │
                            ▼                ▼
                     ┌───────────┐     ┌──────────────┐
                     │ CANCELLED │     │ RELEASE_QUEUE│
                     └───────────┘     └──────────────┘`}
            </pre>
            <ul className="mt-6 space-y-3 text-slate-300">
              <li>
                <strong className="text-white">PENDING:</strong> Capital initialization phase staged via clearing frameworks and awaiting validation.
              </li>
              <li>
                <strong className="text-white">ACTIVE:</strong> Contract lives and accrues yield daily with capital secured in USER_CAPITAL_LOCKED.
              </li>
              <li>
                <strong className="text-white">MATURED:</strong> Term finished, interest credited and optional rollover or liquidity queue triggered.
              </li>
            </ul>
          </div>
        </section>

        <div className="mt-12 text-sm text-slate-500">
          <Link href="/" className="text-emerald-300 hover:text-white">
            ← Back to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
