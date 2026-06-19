import Link from "next/link";

export const metadata = {
  title: "FAQ | Wertchain Immutable Master Ledger",
  description:
    "Frequently asked questions about Wertchain’s ledger-backed investment contracts, custody model, and risk controls.",
};

const faqs = [
  {
    question: "How does Wertchain keep capital segregated?",
    answer:
      "Wertchain uses a fully internal ledger system that separates custody deposits from customer contracts. Funds are tracked through discrete accounting entries rather than mixed in pooled lending structures.",
  },
  {
    question: "Is my deposit lent to third parties?",
    answer:
      "No. Wertchain does not place customer deposits into external lending pools, DeFi protocols, or off-platform counterparties. Yield is generated through platform-managed, contractually governed investment cycles.",
  },
  {
    question: "Can I verify outcomes independently?",
    answer:
      "Yes. Each ledger event is hash-linked and can be reconciled against on-chain deposit verification records, allowing independent verification of the platform’s liability coverage.",
  },
  {
    question: "What happens at contract maturity?",
    answer:
      "At maturity, interest is posted, and your capital is either returned or automatically rolled into a new contract if auto-reinvest is selected. The value transition is recorded as immutable ledger state changes.",
  },
];

export default function FAQPage() {
  return (
    <div className="bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:px-12">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">FAQ</p>
          <h1 className="text-4xl font-semibold text-white sm:text-5xl">
            Frequently Asked Questions
          </h1>
          <p className="max-w-3xl text-lg leading-8 text-slate-300">
            Clear answers about how Wertchain secures your capital, how contracts are governed, and what the ledger model means for transparency.
          </p>
        </div>

        <div className="mt-12 space-y-6">
          {faqs.map((item) => (
            <div key={item.question} className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl shadow-slate-950/20">
              <h2 className="text-xl font-semibold text-white">{item.question}</h2>
              <p className="mt-3 text-slate-300 leading-7">{item.answer}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-sm text-slate-500">
          <Link href="/" className="text-slate-200 hover:text-white">
            ← Back to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
