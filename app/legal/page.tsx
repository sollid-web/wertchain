import Link from "next/link";

export const metadata = {
  title: "Legal | Wertchain Immutable Master Ledger",
  description:
    "Legal terms for Wertchain investments, disclosure of custody practices, and statements on auditability and risk.",
};

export default function LegalPage() {
  return (
    <div className="bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:px-12">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Legal</p>
          <h1 className="text-4xl font-semibold text-white sm:text-5xl">
            Legal & Disclosure
          </h1>
          <p className="max-w-3xl text-lg leading-8 text-slate-300">
            The products and descriptions on this site are for informational purposes only and do not constitute an offer to sell or a solicitation of an offer to buy any investment product.
          </p>
        </div>

        <section className="mt-14 space-y-10">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl shadow-slate-950/20">
            <h2 className="text-2xl font-semibold text-white">No Offer</h2>
            <p className="mt-4 text-slate-300 leading-7">
              Nothing on this website should be considered an invitation, offer, or recommendation to invest. Investment activity is only available to eligible customers through the platform’s registered onboarding flow.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl shadow-slate-950/20">
            <h2 className="text-2xl font-semibold text-white">Custody and Auditability</h2>
            <p className="mt-4 text-slate-300 leading-7">
              Wertchain is designed to maintain independent custody controls and an auditable transaction ledger. Historical states are protected by cryptographic chaining, and internal controls separate user-facing balances from platform liabilities.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl shadow-slate-950/20">
            <h2 className="text-2xl font-semibold text-white">Risk Disclosure</h2>
            <p className="mt-4 text-slate-300 leading-7">
              All investments carry risk. Past performance is not a guarantee of future results. Capital may fluctuate, and the value of any contract depends on platform governance and market conditions.
            </p>
          </div>
        </section>

        <div className="mt-12 text-sm text-slate-500">
          <Link href="/" className="text-slate-200 hover:text-white">
            ← Back to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
