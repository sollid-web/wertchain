import Link from "next/link";

export const metadata = {
  title: "Governance & Compliance | Wertchain Immutable Master Ledger",
  description:
    "Review Wertchain’s governance framework: independent custody, full auditability, no external lending, and business-aligned fiduciary controls.",
};

export default function GovernancePage() {
  return (
    <div className="bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:px-12">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-amber-300">Governance</p>
          <h1 className="text-4xl font-semibold text-white sm:text-5xl">
            A Compliance-First Operational Model
          </h1>
          <p className="max-w-3xl text-lg leading-8 text-slate-300">
            Wertchain builds every product decision around transparency, capital segregation, and a refusal to leverage third-party counterparties.
          </p>
        </div>

        <section className="mt-14 grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl shadow-slate-950/20">
            <h2 className="text-2xl font-semibold text-white">No External Lending</h2>
            <p className="mt-4 text-slate-300 leading-7">
              No user funds are placed into unaudited counterparties, lending pools, or algorithmic vaults. Capital remains locked to the platform and is managed through internal contractual accounting while fully reconciling to user-facing balances.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl shadow-slate-950/20">
            <h2 className="text-2xl font-semibold text-white">Independent Custody Principles</h2>
            <p className="mt-4 text-slate-300 leading-7">
              Wertchain operates on an independent custody foundation: deposits are verified on-chain, while the internal ledger separately tracks liability and accounting state without relying on external collateral assumptions.
            </p>
          </div>
        </section>

        <section className="mt-14 space-y-10">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl shadow-slate-950/20">
              <h3 className="text-xl font-semibold text-white">Transparent Capital Allocation</h3>
              <p className="mt-3 text-slate-300 leading-7">
                Product performance is backed by explicit on-chain deposit coverage and the ledger’s immutable state. There is no hidden reinvestment of outside yield.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl shadow-slate-950/20">
              <h3 className="text-xl font-semibold text-white">Fiduciary Control</h3>
              <p className="mt-3 text-slate-300 leading-7">
                Our controls are designed to align managerial incentives with customer capital preservation: every deployment is a ledger transaction, never a promise.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl shadow-slate-950/20">
            <h2 className="text-2xl font-semibold text-white">Auditability & Reporting</h2>
            <p className="mt-4 text-slate-300 leading-7">
              The platform is built for audit-first reporting. Every balance can be traced to an entry in the ledger, and every cash movement is described by an immutable event sequence.
            </p>
            <ul className="mt-6 space-y-4 text-slate-300">
              <li>
                <strong className="text-white">Full liability reconciliation,</strong> aligning deposits, contracts, and payout obligations.
              </li>
              <li>
                <strong className="text-white">Dedicated balance classes,</strong> separating custody deposits from profit obligations and released capital.
              </li>
              <li>
                <strong className="text-white">Operational review cycles,</strong> built around daily state validation and cross-system matching.
              </li>
            </ul>
          </div>
        </section>

        <div className="mt-12 text-sm text-slate-500">
          <Link href="/" className="text-amber-300 hover:text-white">
            ← Back to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
