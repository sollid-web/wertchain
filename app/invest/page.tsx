import Link from "next/link";

export const metadata = {
  title: "Investment Overview | Wertchain Immutable Master Ledger",
  description:
    "Explore Wertchain investment tiers, fixed-term contract structure, and custody-backed capital allocation.",
};

const tiers = [
  {
    label: "Wertchain Start",
    min: "$1,000",
    max: "$4,999",
    duration: "14 Days",
    rate: "5%",
    delay: "14 Days",
    reinvest: "Default ON",
  },
  {
    label: "Wertchain Growth",
    min: "$5,000",
    max: "$14,999",
    duration: "30 Days",
    rate: "8%",
    delay: "30 Days",
    reinvest: "Default ON",
  },
  {
    label: "Wertchain Professional",
    min: "$15,000",
    max: "$49,999",
    duration: "60 Days",
    rate: "18%",
    delay: "30 Days",
    reinvest: "Default ON",
  },
  {
    label: "Wertchain Elite",
    min: "$50,000",
    max: "Unlimited",
    duration: "120 Days",
    rate: "40%",
    delay: "60 Days",
    reinvest: "Default ON",
  },
];

export default function InvestPage() {
  return (
    <div className="bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:px-12">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-amber-300">Investment Overview</p>
          <h1 className="text-4xl font-semibold text-white sm:text-5xl">
            Fixed-Term Contracts Backed by Immutable Ledger Control
          </h1>
          <p className="max-w-3xl text-lg leading-8 text-slate-300">
            Wertchain offers a discrete set of fixed-term investment tiers built around audit-first accounting and structural capital separation. Every commitment is represented in the ledger as a precise debit/credit pair, not a pooled claim.
          </p>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl shadow-slate-950/20">
            <h2 className="text-2xl font-semibold text-white">Contract Discipline</h2>
            <p className="mt-4 text-slate-300 leading-7">
              Each plan is a self-contained contract lifecycle. Maturity, payout, and optional reinvestment are enforced through deterministic state transitions rather than discretionary accounting.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl shadow-slate-950/20">
            <h2 className="text-2xl font-semibold text-white">Custody Integrity</h2>
            <p className="mt-4 text-slate-300 leading-7">
              Capital is segregated at the ledger level. Active commitments are tracked separately from available balances, reducing the possibility of unintended liability commingling.
            </p>
          </div>
        </div>

        <section className="mt-14 space-y-10">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl shadow-slate-950/20">
            <h2 className="text-2xl font-semibold text-white">Plan Structure</h2>
            <p className="mt-4 text-slate-300 leading-7">
              Every deposit enters a plan with a known term, fixed yield assumption, and a defined release window. This prevents opaque duration drift and keeps the capital cycle visible.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl shadow-slate-950/20">
            <h2 className="text-2xl font-semibold text-white">Autonomous Reinvestment</h2>
            <p className="mt-4 text-slate-300 leading-7">
              Auto-reinvest is the default behavior for every plan, allowing maturity outcomes to flow back into new contract cycles without manual negotiation.
            </p>
          </div>
        </section>

        <div className="mt-14 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/90 shadow-xl shadow-slate-950/30">
          <div className="bg-slate-950/80 px-6 py-6 text-slate-400">
            <p className="text-sm uppercase tracking-[0.35em]">Allocation Matrix</p>
          </div>
          <table className="w-full border-separate border-spacing-0 text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400">
              <tr>
                <th className="px-6 py-4">Tier</th>
                <th className="px-6 py-4">Minimum</th>
                <th className="px-6 py-4">Maximum</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Yield</th>
                <th className="px-6 py-4">Release Delay</th>
                <th className="px-6 py-4">Reinvest</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((tier) => (
                <tr key={tier.label} className="border-t border-slate-800/90 hover:bg-slate-900/80">
                  <td className="px-6 py-4 font-semibold text-white">{tier.label}</td>
                  <td className="px-6 py-4">{tier.min}</td>
                  <td className="px-6 py-4">{tier.max}</td>
                  <td className="px-6 py-4">{tier.duration}</td>
                  <td className="px-6 py-4 text-emerald-300">{tier.rate}</td>
                  <td className="px-6 py-4">{tier.delay}</td>
                  <td className="px-6 py-4">{tier.reinvest}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-14 rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl shadow-slate-950/20">
          <h2 className="text-2xl font-semibold text-white">How to Engage</h2>
          <p className="mt-4 text-slate-300 leading-7">
            Clients onboard through the platform interface, select a tier, and establish the deposit amount. The system then creates a verifiable contract record and assigns all ledger entries to the corresponding liability classes.
          </p>
          <p className="mt-4 text-slate-300 leading-7">
            Because the platform is ledger-first, every step is auditable and all capital commitments are anchored in a consistent financial state machine.
          </p>
        </div>

        <div className="mt-12 flex flex-wrap gap-3 text-sm text-slate-500">
          <Link href="/" className="text-amber-300 hover:text-white">
            ← Back to homepage
          </Link>
          <Link href="/legal" className="text-slate-200 hover:text-white">
            Legal disclosure
          </Link>
        </div>
      </div>
    </div>
  );
}
