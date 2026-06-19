import Link from 'next/link'

export const metadata = {
  title: 'Wertchain | Institutional Investment Platform',
  description: 'A production-grade fixed-yield investment platform built on an immutable Master Ledger with double-entry accounting. Predictable returns, complete transparency.',
}

const PLANS = [
  { name: 'Start',        tier: 'WERTCHAIN_START',        min: '$1,000',  max: '$4,999',    days: 14,  rate: '5%',  delay: '14 days' },
  { name: 'Growth',       tier: 'WERTCHAIN_GROWTH',       min: '$5,000',  max: '$14,999',   days: 30,  rate: '8%',  delay: '30 days' },
  { name: 'Professional', tier: 'WERTCHAIN_PROFESSIONAL', min: '$15,000', max: '$49,999',   days: 60,  rate: '18%', delay: '30 days' },
  { name: 'Elite',        tier: 'WERTCHAIN_ELITE',        min: '$50,000', max: 'Unlimited', days: 120, rate: '40%', delay: '60 days' },
]

const TRUST = [
  { stat: 'NUMERIC(20,8)', label: 'Exact-point arithmetic — no floating-point drift' },
  { stat: 'SHA-256',       label: 'Cryptographic hash chain per investor ledger' },
  { stat: 'Double-Entry',  label: 'Every movement balanced by a debit and credit' },
  { stat: '100%',          label: 'Balances reconstructable from ledger history' },
]

const FEATURES = [
  {
    title: 'Immutable Master Ledger',
    body: 'Every deposit, yield accrual, migration, and withdrawal is permanently recorded as an atomic debit/credit pair. No balance exists that cannot be verified from first-principle transaction logs. Corrections are executed via transparent REVERSAL entries — never silent overwrites.',
  },
  {
    title: 'Capital & Profit Separation',
    body: 'Your invested capital and accrued yields are held in structurally separate accounts. Capital stays locked in USER_CAPITAL_LOCKED for the contract duration. Profits flow to USER_WALLET at maturity and are immediately available — no delays on yield withdrawals.',
  },
  {
    title: 'Automated Reinvestment',
    body: 'At maturity, your profit is credited to your wallet and your capital automatically rolls into a new contract at the same terms. No manual action required. You can disable this at any point during the contract cycle to receive your capital after the release delay.',
  },
  {
    title: 'Seamless Plan Migration',
    body: 'Move capital between tiers at maturity without withdrawal delays. Capital transfers directly through an atomic PLATFORM_MIGRATION_RESERVE transit — your assets are never untracked during tier transitions. Top up from your available balance when upgrading.',
  },
  {
    title: 'Daily Yield Accrual',
    body: 'Profit accumulates daily from day one. The daily amount is locked at contract creation: principal × rate ÷ duration. The final day uses a remainder formula to eliminate any rounding drift, ensuring you receive exactly the contracted yield — not an approximation.',
  },
  {
    title: '4-Eyes Authorization',
    body: 'Any manual ledger adjustment requires dual SUPER_ADMIN authorization with a documented justification of at least 50 characters. Every admin action records full before/after state snapshots in an append-only, database-level write-protected audit log.',
  },
]

const FAQ = [
  {
    q: 'How are my account balances verified?',
    a: 'Every balance is directly linked to unalterable ledger history. Each night, an automated reconciliation recalculates every debit and credit from first principles and cross-checks against cached tables. Any variance greater than $0.00000001 triggers an immediate security alert.',
  },
  {
    q: 'Why is there a release delay on capital withdrawals?',
    a: 'When you invest, your capital is deployed into structured yield-generating environments for the full cycle duration. The release delay protects all platform participants by preventing sudden large capital movements from disrupting active generation cycles.',
  },
  {
    q: 'Are my daily yields subject to the same lock-up as my capital?',
    a: 'No. Daily yields are credited to your available balance (USER_WALLET) at maturity and are immediately withdrawable — provided your KYC verification is complete. Only the invested principal is subject to the release delay if you cancel auto-reinvest.',
  },
  {
    q: 'Can I exit a contract early?',
    a: 'Contracts cannot be cancelled mid-term. The capital is locked inside a strict database state machine for the full duration. If you want to access capital at maturity, disable the Auto-Reinvest option in your dashboard — your capital will enter the release queue at maturity.',
  },
  {
    q: 'How does plan migration work?',
    a: 'At maturity, you can migrate capital directly into another tier without withdrawal delays. The system posts an atomic MIGRATION_DEBIT and MIGRATION_CREDIT through a transit reserve that must net to zero — your capital is never untracked during the move.',
  },
  {
    q: 'What KYC is required to withdraw?',
    a: 'Your account must reach VERIFIED status before any withdrawal can be processed. Unverified accounts have read-only access. Capital remains safely accounted for in the master ledger while verification is pending.',
  },
]

const LEDGER_ROWS = [
  { event: 'Deposit Confirmed',  dr: 'PLATFORM_DEPOSIT_CLEARING', cr: 'USER_WALLET',              color: 'text-emerald-700' },
  { event: 'Contract Created',   dr: 'USER_WALLET',               cr: 'USER_CAPITAL_LOCKED',       color: 'text-blue-700' },
  { event: 'Daily Yield',        dr: 'PLATFORM_PROFIT_LIABILITY', cr: 'USER_PROFIT_PENDING',        color: 'text-amber-700' },
  { event: 'Maturity Credit',    dr: 'USER_PROFIT_PENDING',       cr: 'USER_WALLET',               color: 'text-emerald-700' },
  { event: 'Withdrawal',         dr: 'USER_WALLET',               cr: 'PLATFORM_WITHDRAWAL_RESERVE', color: 'text-red-700' },
  { event: 'Migration',          dr: 'USER_CAPITAL_LOCKED',       cr: 'PLATFORM_MIGRATION_RESERVE',  color: 'text-purple-700' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── NAV ── */}
      <nav className="border-b border-gray-100 sticky top-0 z-50 bg-white/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
              <span className="text-white text-sm font-black">W</span>
            </div>
            <span className="font-semibold text-gray-900 text-lg tracking-tight">Wertchain</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-500">
            <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How It Works</a>
            <a href="#plans"        className="hover:text-gray-900 transition-colors">Plans</a>
            <a href="#security"     className="hover:text-gray-900 transition-colors">Security</a>
            <a href="#faq"          className="hover:text-gray-900 transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login"  className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Sign in</Link>
            <Link href="/signup" className="px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium transition-colors">
              Open Account
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Fixed-yield · Fully auditable · Capital-protected
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight tracking-tight mb-6">
            Institutional-grade<br />
            <span className="text-amber-500">investment infrastructure.</span>
          </h1>
          <p className="text-xl text-gray-500 leading-relaxed mb-10 max-w-2xl">
            Wertchain delivers predictable fixed-yield returns through an immutable Master Ledger with double-entry accounting. Your capital and profits are structurally separated, cryptographically tracked, and fully auditable at every step.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/signup" className="px-6 py-3.5 rounded-xl bg-gray-900 hover:bg-gray-700 text-white font-semibold transition-colors text-sm">
              Start Investing
            </Link>
            <a href="#plans" className="px-6 py-3.5 rounded-xl border border-gray-200 hover:border-gray-300 text-gray-700 font-medium transition-colors text-sm">
              View Plans →
            </a>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <section className="border-y border-gray-100 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {TRUST.map(t => (
            <div key={t.stat} className="space-y-1">
              <p className="text-2xl font-bold text-gray-900 tracking-tight">{t.stat}</p>
              <p className="text-sm text-gray-500">{t.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PLANS ── */}
      <section id="plans" className="max-w-6xl mx-auto px-6 py-24">
        <div className="mb-12">
          <p className="text-sm text-amber-600 font-medium uppercase tracking-widest mb-3">Investment Plans</p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight mb-3">Fixed-Term Capital Tiers</h2>
          <p className="text-gray-500 max-w-xl">All terms — yield rate, duration, and release delay — are mathematically locked at contract creation and cannot be changed retroactively.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANS.map((plan, i) => (
            <div key={plan.name} className={`rounded-2xl border p-6 flex flex-col ${i === 3 ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all'}`}>
              <div className="flex items-center justify-between mb-6">
                <span className={`text-xs font-semibold uppercase tracking-widest ${i === 3 ? 'text-amber-400' : 'text-gray-400'}`}>{plan.name}</span>
                <span className={`text-2xl font-bold ${i === 3 ? 'text-amber-400' : 'text-gray-900'}`}>{plan.rate}</span>
              </div>
              <div className="space-y-3 text-sm flex-1">
                {[
                  ['Min deposit', plan.min],
                  ['Max deposit', plan.max],
                  ['Duration',    `${plan.days} days`],
                  ['Release delay', plan.delay],
                  ['Auto-reinvest', 'Default ON'],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between">
                    <span className={i === 3 ? 'text-gray-400' : 'text-gray-400'}>{label}</span>
                    <span className={`font-medium ${i === 3 ? 'text-white' : 'text-gray-900'}`}>{val}</span>
                  </div>
                ))}
              </div>
              <Link href="/signup" className={`mt-6 w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-colors ${
                i === 3
                  ? 'bg-amber-500 hover:bg-amber-400 text-black'
                  : 'bg-gray-900 hover:bg-gray-700 text-white'
              }`}>
                Invest Now
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="bg-gray-50 border-y border-gray-100 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-12">
            <p className="text-sm text-amber-600 font-medium uppercase tracking-widest mb-3">How It Works</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight mb-3">Simple process. Airtight infrastructure.</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Create Account', body: 'Sign up and complete identity verification. KYC is required before any withdrawal can be processed.' },
              { step: '02', title: 'Choose a Plan',  body: 'Select a fixed-term tier that matches your capital and timeline. All terms lock at the moment your deposit is confirmed.' },
              { step: '03', title: 'Send Deposit',   body: 'Send your crypto deposit to the platform wallet and submit your transaction hash. Admin confirms receipt and activates your contract.' },
              { step: '04', title: 'Earn Daily',     body: 'Profit accrues daily. At maturity your yield is credited instantly to your wallet. Capital auto-reinvests or enters the release queue.' },
            ].map(s => (
              <div key={s.step} className="bg-white rounded-2xl border border-gray-200 p-6">
                <span className="text-3xl font-black text-gray-100 block mb-4">{s.step}</span>
                <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="mb-12">
          <p className="text-sm text-amber-600 font-medium uppercase tracking-widest mb-3">Platform Features</p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">Built for financial precision.</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <div key={f.title} className="rounded-2xl border border-gray-200 p-6 hover:border-gray-300 hover:shadow-sm transition-all">
              <div className="w-8 h-1 bg-amber-500 rounded-full mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECURITY / LEDGER ── */}
      <section id="security" className="bg-gray-900 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-12">
            <p className="text-sm text-amber-400 font-medium uppercase tracking-widest mb-3">Ledger Architecture</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">Every cent accounted for.</h2>
            <p className="text-gray-400 max-w-xl">The double-entry posting map below shows exactly how every financial event is recorded. No money moves on Wertchain without two balancing ledger entries.</p>
          </div>

          <div className="rounded-2xl overflow-hidden border border-gray-700 mb-10">
            <div className="grid grid-cols-3 bg-gray-800 px-5 py-3 text-xs text-gray-500 font-mono uppercase tracking-widest">
              <span>Event</span><span>Debit (DR)</span><span>Credit (CR)</span>
            </div>
            {LEDGER_ROWS.map((row, i) => (
              <div key={row.event} className={`grid grid-cols-3 px-5 py-3.5 text-xs font-mono border-t border-gray-800 ${i % 2 === 0 ? 'bg-gray-900' : 'bg-gray-850'}`}>
                <span className="text-amber-400 font-medium">{row.event}</span>
                <span className="text-red-400">{row.dr}</span>
                <span className="text-emerald-400">{row.cr}</span>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { title: 'Row-Level Security',    body: 'Every user can only query their own rows at the database engine level — not the application layer. Admin access operates on isolated channels.' },
              { title: 'Cryptographic Chain',   body: 'Each ledger transaction embeds a SHA-256 hash of the prior transaction. Any unauthorized database modification breaks the chain and triggers an alert.' },
              { title: 'Append-Only Audit Log', body: 'The wc_admin_audit_log table has database-level write blocks. No updates or deletes — ever. Full before/after snapshots on every admin action.' },
            ].map(c => (
              <div key={c.title} className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
                <div className="w-6 h-0.5 bg-amber-500 mb-3" />
                <h3 className="text-white font-semibold text-sm mb-2">{c.title}</h3>
                <p className="text-gray-400 text-xs leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="max-w-4xl mx-auto px-6 py-24">
        <div className="mb-12">
          <p className="text-sm text-amber-600 font-medium uppercase tracking-widest mb-3">FAQ</p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">Common questions.</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {FAQ.map((item, i) => (
            <details key={i} className="group py-5">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="font-medium text-gray-900 pr-8">{item.q}</span>
                <span className="text-gray-400 group-open:rotate-45 transition-transform duration-200 text-xl shrink-0">+</span>
              </summary>
              <p className="mt-4 text-gray-500 text-sm leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-amber-50 border-y border-amber-100 py-20">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight mb-4">
            Ready to put your capital to work?
          </h2>
          <p className="text-gray-500 mb-8">Open an account in minutes. Invest from $1,000. Earn daily.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup" className="px-8 py-3.5 rounded-xl bg-gray-900 hover:bg-gray-700 text-white font-semibold transition-colors">
              Create Account
            </Link>
            <Link href="/login" className="px-8 py-3.5 rounded-xl border border-gray-300 hover:border-gray-400 text-gray-700 font-medium transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── LEGAL ── */}
      <section className="bg-gray-50 border-t border-gray-100 py-10">
        <div className="max-w-4xl mx-auto px-6 text-xs text-gray-400 leading-relaxed space-y-3">
          <p><strong className="text-gray-500">Risk Disclosure:</strong> By initializing an investment contract within the Wertchain ecosystem, the allocator acknowledges that they have reviewed and agreed to the structural rules detailed on this portal. Yield rates, duration windows, and liquidity release delays are locked at the moment a contract becomes active. Changes to plan parameters apply only to future contracts — active deployments are insulated from retroactive updates.</p>
          <p><strong className="text-gray-500">Liquidity Terms:</strong> Early capital extraction before structural maturity is blocked at the system layer. The platform cannot waive release delays under any circumstances. All users must complete identity verification before any withdrawal can be processed.</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-gray-900 flex items-center justify-center">
              <span className="text-white text-xs font-black">W</span>
            </div>
            <span className="text-gray-400 text-sm">Wertchain — Master Ledger Investment Platform</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-400">
            <Link href="/login"   className="hover:text-gray-700 transition-colors">Sign In</Link>
            <Link href="/signup"  className="hover:text-gray-700 transition-colors">Create Account</Link>
            <a href="#faq"        className="hover:text-gray-700 transition-colors">FAQ</a>
            <a href="#security"   className="hover:text-gray-700 transition-colors">Security</a>
          </div>
        </div>
      </footer>

    </div>
  )
}