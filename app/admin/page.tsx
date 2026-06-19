'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/supabase/client'

// ── types ──────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'deposits' | 'withdrawals' | 'migrations' | 'users'

interface Stats {
  totalLockedCapital: number
  totalAvailableBalance: number
  pendingDeposits: number
  pendingWithdrawals: number
  pendingMigrations: number
  activeContracts: number
  totalUsers: number
}

interface Deposit {
  id: string
  user_id: string
  amount: number
  payment_method: string
  payment_reference: string
  status: string
  created_at: string
  wc_users: { full_name: string; email: string } | null
}

interface Withdrawal {
  id: string
  user_id: string
  amount: number
  withdrawal_type: string
  status: string
  created_at: string
  destination_details: Record<string, string>
  wc_users: { full_name: string; email: string } | null
}

interface Migration {
  id: string
  user_id: string
  capital_amount: number
  topup_amount: number
  migration_type: string
  target_plan_tier: string
  status: string
  created_at: string
  wc_users: { full_name: string; email: string } | null
}

interface User {
  id: string
  full_name: string
  email: string
  kyc_status: string
  is_suspended: boolean
  is_active: boolean
  created_at: string
}

// ── helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const STATUS_COLORS: Record<string, string> = {
  PENDING:   'text-amber-400 bg-amber-400/10 border-amber-400/20',
  APPROVED:  'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  REJECTED:  'text-red-400 bg-red-400/10 border-red-400/20',
  CANCELLED: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20',
  VERIFIED:  'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  UNVERIFIED:'text-zinc-400 bg-zinc-400/10 border-zinc-400/20',
  PENDING_REVIEW: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
}

function Badge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-mono tracking-wide ${STATUS_COLORS[status] ?? 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20'}`}>
      {status}
    </span>
  )
}

// ── stat card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent = false }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 flex flex-col gap-1 ${accent ? 'border-amber-500/30 bg-amber-500/5' : 'border-[#1E2A3B] bg-[#111827]'}`}>
      <span className="text-xs text-zinc-500 uppercase tracking-widest">{label}</span>
      <span className={`text-xl font-mono font-semibold ${accent ? 'text-amber-400' : 'text-white'}`}>{value}</span>
      {sub && <span className="text-xs text-zinc-600">{sub}</span>}
    </div>
  )
}

// ── main component ─────────────────────────────────────────────────────────
export default function AdminPanel() {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('overview')
  const [stats, setStats] = useState<Stats | null>(null)
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [migrations, setMigrations] = useState<Migration[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  // ── data fetchers ──────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    const [wallets, pendingDep, pendingWith, pendingMig, contracts, usersCount] = await Promise.all([
      supabase.from('wc_wallet_balances').select('locked_capital, available_balance'),
      supabase.from('wc_deposits').select('id', { count: 'exact' }).eq('status', 'PENDING'),
      supabase.from('wc_withdrawals').select('id', { count: 'exact' }).eq('status', 'PENDING'),
      supabase.from('wc_migrations').select('id', { count: 'exact' }).eq('status', 'PENDING'),
      supabase.from('wc_contracts').select('id', { count: 'exact' }).eq('state', 'ACTIVE'),
      supabase.from('wc_users').select('id', { count: 'exact' }),
    ])
    const locked    = wallets.data?.reduce((s: number, w: any) => s + Number(w.locked_capital ?? 0), 0) ?? 0
    const available = wallets.data?.reduce((s: number, w: any) => s + Number(w.available_balance ?? 0), 0) ?? 0
    setStats({
      totalLockedCapital: locked,
      totalAvailableBalance: available,
      pendingDeposits:    pendingDep.count   ?? 0,
      pendingWithdrawals: pendingWith.count  ?? 0,
      pendingMigrations:  pendingMig.count   ?? 0,
      activeContracts:    contracts.count    ?? 0,
      totalUsers:         usersCount.count   ?? 0,
    })
  }, [supabase])

  const loadDeposits = useCallback(async () => {
    const { data } = await supabase
      .from('wc_deposits')
      .select('*, wc_users(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(100)
    setDeposits((data as any) ?? [])
  }, [supabase])

  const loadWithdrawals = useCallback(async () => {
    const { data } = await supabase
      .from('wc_withdrawals')
      .select('*, wc_users(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(100)
    setWithdrawals((data as any) ?? [])
  }, [supabase])

  const loadMigrations = useCallback(async () => {
    const { data } = await supabase
      .from('wc_migrations')
      .select('*, wc_users(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(100)
    setMigrations((data as any) ?? [])
  }, [supabase])

  const loadUsers = useCallback(async () => {
    const { data } = await supabase
      .from('wc_users')
      .select('id, full_name, email, kyc_status, is_suspended, is_active, created_at')
      .order('created_at', { ascending: false })
      .limit(200)
    setUsers((data as User[]) ?? [])
  }, [supabase])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await loadStats()
      if (tab === 'deposits')    await loadDeposits()
      if (tab === 'withdrawals') await loadWithdrawals()
      if (tab === 'migrations')  await loadMigrations()
      if (tab === 'users')       await loadUsers()
      setLoading(false)
    }
    load()
  }, [tab, loadStats, loadDeposits, loadWithdrawals, loadMigrations, loadUsers])

  // ── actions ────────────────────────────────────────────────────────────
  async function approveDeposit(id: string) {
    setActionLoading(id)
    try {
      const res = await fetch('/api/admin/deposits/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deposit_id: id, action: 'APPROVE' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast('Deposit approved. Ledger posted.', true)
      await loadDeposits()
      await loadStats()
    } catch (e: unknown) {
      showToast((e as Error).message ?? 'Failed', false)
    } finally {
      setActionLoading(null)
    }
  }

  async function rejectDeposit(id: string) {
    const reason = prompt('Rejection reason (required):')
    if (!reason) return
    setActionLoading(id)
    try {
      const res = await fetch('/api/admin/deposits/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deposit_id: id, action: 'REJECT', reason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast('Deposit rejected.', true)
      await loadDeposits()
      await loadStats()
    } catch (e: unknown) {
      showToast((e as Error).message ?? 'Failed', false)
    } finally {
      setActionLoading(null)
    }
  }

  async function approveWithdrawal(id: string) {
    setActionLoading(id)
    try {
      const res = await fetch('/api/admin/withdrawals/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawal_id: id, action: 'APPROVE' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast('Withdrawal approved.', true)
      await loadWithdrawals()
      await loadStats()
    } catch (e: unknown) {
      showToast((e as Error).message ?? 'Failed', false)
    } finally {
      setActionLoading(null)
    }
  }

  async function rejectWithdrawal(id: string) {
    const reason = prompt('Rejection reason (required):')
    if (!reason) return
    setActionLoading(id)
    try {
      const res = await fetch('/api/admin/withdrawals/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawal_id: id, action: 'REJECT', reason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast('Withdrawal rejected. Funds returned.', true)
      await loadWithdrawals()
      await loadStats()
    } catch (e: unknown) {
      showToast((e as Error).message ?? 'Failed', false)
    } finally {
      setActionLoading(null)
    }
  }

  async function approveMigration(id: string) {
    setActionLoading(id)
    try {
      const res = await fetch('/api/admin/migrations/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ migration_id: id, action: 'APPROVE' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast('Migration approved. New contract created.', true)
      await loadMigrations()
      await loadStats()
    } catch (e: unknown) {
      showToast((e as Error).message ?? 'Failed', false)
    } finally {
      setActionLoading(null)
    }
  }

  async function rejectMigration(id: string) {
    const reason = prompt('Rejection reason (required):')
    if (!reason) return
    setActionLoading(id)
    try {
      const res = await fetch('/api/admin/migrations/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ migration_id: id, action: 'REJECT', reason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast('Migration rejected.', true)
      await loadMigrations()
    } catch (e: unknown) {
      showToast((e as Error).message ?? 'Failed', false)
    } finally {
      setActionLoading(null)
    }
  }

  // ── tab content ────────────────────────────────────────────────────────
  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: 'overview',     label: 'Overview' },
    { id: 'deposits',     label: 'Deposits',    badge: stats?.pendingDeposits },
    { id: 'withdrawals',  label: 'Withdrawals', badge: stats?.pendingWithdrawals },
    { id: 'migrations',   label: 'Migrations',  badge: stats?.pendingMigrations },
    { id: 'users',        label: 'Users' },
  ]

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white font-sans">

      {/* ── toast ── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg border text-sm font-medium shadow-xl transition-all
          ${toast.ok ? 'bg-emerald-900/80 border-emerald-500/40 text-emerald-300' : 'bg-red-900/80 border-red-500/40 text-red-300'}`}>
          {toast.msg}
        </div>
      )}

      {/* ── top bar ── */}
      <div className="border-b border-[#1E2A3B] bg-[#0A0F1E]/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-amber-500 flex items-center justify-center">
              <span className="text-black text-xs font-black">W</span>
            </div>
            <span className="font-semibold tracking-wide text-white">Wertchain</span>
            <span className="text-zinc-600 text-xs font-mono ml-1">ADMIN</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-zinc-500">
            {stats && (
              <>
                <span>LOCKED <span className="text-amber-400">{fmt(stats.totalLockedCapital)}</span></span>
                <span className="hidden sm:inline">ACTIVE <span className="text-white">{stats.activeContracts}</span></span>
                <span>USERS <span className="text-white">{stats.totalUsers}</span></span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* ── tabs ── */}
        <div className="flex gap-1 border-b border-[#1E2A3B] mb-6 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors relative
                ${tab === t.id
                  ? 'text-amber-400 border-b-2 border-amber-400 -mb-px'
                  : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              {t.label}
              {t.badge && t.badge > 0 ? (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-black text-[10px] font-bold">
                  {t.badge > 9 ? '9+' : t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48 text-zinc-600 text-sm">Loading…</div>
        ) : (
          <>
            {/* ── OVERVIEW ── */}
            {tab === 'overview' && stats && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  <StatCard label="Total Locked Capital"    value={fmt(stats.totalLockedCapital)}    accent />
                  <StatCard label="Available Balances"      value={fmt(stats.totalAvailableBalance)} />
                  <StatCard label="Active Contracts"        value={String(stats.activeContracts)} />
                  <StatCard label="Registered Users"        value={String(stats.totalUsers)} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <StatCard label="Pending Deposits"    value={String(stats.pendingDeposits)}    sub="Awaiting approval" />
                  <StatCard label="Pending Withdrawals" value={String(stats.pendingWithdrawals)} sub="Awaiting payout" />
                  <StatCard label="Pending Migrations"  value={String(stats.pendingMigrations)}  sub="Awaiting review" />
                </div>
                <div className="rounded-lg border border-[#1E2A3B] bg-[#111827] p-4">
                  <p className="text-xs text-zinc-600 font-mono">
                    All balances are derived from the master ledger. The canonical balance for any user can be reconstructed with:<br />
                    <span className="text-zinc-400">SELECT SUM(amount) FILTER (WHERE direction = 'CREDIT') - SUM(amount) FILTER (WHERE direction = 'DEBIT') FROM wc_ledger_entries WHERE account_type = 'USER_WALLET' AND user_id = :id</span>
                  </p>
                </div>
              </div>
            )}

            {/* ── DEPOSITS ── */}
            {tab === 'deposits' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-zinc-300">All Deposits</h2>
                  <span className="text-xs text-zinc-600 font-mono">{deposits.length} records</span>
                </div>
                {deposits.length === 0 && <p className="text-zinc-600 text-sm">No deposits yet.</p>}
                {deposits.map(d => (
                  <div key={d.id} className="rounded-lg border border-[#1E2A3B] bg-[#111827] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-mono font-semibold">{fmt(d.amount)}</span>
                          <Badge status={d.status} />
                        </div>
                        <p className="text-xs text-zinc-400">{d.wc_users?.full_name} · {d.wc_users?.email}</p>
                        <p className="text-xs text-zinc-600 font-mono">{d.payment_method} · ref: {d.payment_reference ?? '—'}</p>
                        <p className="text-xs text-zinc-700">{fmtDate(d.created_at)}</p>
                      </div>
                      {d.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => approveDeposit(d.id)}
                            disabled={actionLoading === d.id}
                            className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-medium transition-colors"
                          >
                            {actionLoading === d.id ? '…' : 'Approve'}
                          </button>
                          <button
                            onClick={() => rejectDeposit(d.id)}
                            disabled={actionLoading === d.id}
                            className="px-3 py-1.5 rounded bg-red-900/60 hover:bg-red-800 disabled:opacity-40 text-red-300 text-xs font-medium transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── WITHDRAWALS ── */}
            {tab === 'withdrawals' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-zinc-300">All Withdrawals</h2>
                  <span className="text-xs text-zinc-600 font-mono">{withdrawals.length} records</span>
                </div>
                {withdrawals.length === 0 && <p className="text-zinc-600 text-sm">No withdrawals yet.</p>}
                {withdrawals.map(w => (
                  <div key={w.id} className="rounded-lg border border-[#1E2A3B] bg-[#111827] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-mono font-semibold">{fmt(w.amount)}</span>
                          <span className="text-xs text-zinc-500 font-mono">{w.withdrawal_type}</span>
                          <Badge status={w.status} />
                        </div>
                        <p className="text-xs text-zinc-400">{w.wc_users?.full_name} · {w.wc_users?.email}</p>
                        <p className="text-xs text-zinc-600 font-mono">
                          {Object.entries(w.destination_details ?? {}).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                        </p>
                        <p className="text-xs text-zinc-700">{fmtDate(w.created_at)}</p>
                      </div>
                      {w.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => approveWithdrawal(w.id)}
                            disabled={actionLoading === w.id}
                            className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-medium transition-colors"
                          >
                            {actionLoading === w.id ? '…' : 'Approve'}
                          </button>
                          <button
                            onClick={() => rejectWithdrawal(w.id)}
                            disabled={actionLoading === w.id}
                            className="px-3 py-1.5 rounded bg-red-900/60 hover:bg-red-800 disabled:opacity-40 text-red-300 text-xs font-medium transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── MIGRATIONS ── */}
            {tab === 'migrations' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-zinc-300">All Migrations</h2>
                  <span className="text-xs text-zinc-600 font-mono">{migrations.length} records</span>
                </div>
                {migrations.length === 0 && <p className="text-zinc-600 text-sm">No migrations yet.</p>}
                {migrations.map(m => (
                  <div key={m.id} className="rounded-lg border border-[#1E2A3B] bg-[#111827] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-mono font-semibold">{fmt(m.capital_amount)}</span>
                          {m.topup_amount > 0 && (
                            <span className="text-xs text-amber-400 font-mono">+{fmt(m.topup_amount)} top-up</span>
                          )}
                          <span className="text-xs text-zinc-500 font-mono">{m.migration_type}</span>
                          <Badge status={m.status} />
                        </div>
                        <p className="text-xs text-zinc-400">{m.wc_users?.full_name} · {m.wc_users?.email}</p>
                        <p className="text-xs text-zinc-600 font-mono">Target: {m.target_plan_tier}</p>
                        <p className="text-xs text-zinc-700">{fmtDate(m.created_at)}</p>
                      </div>
                      {m.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => approveMigration(m.id)}
                            disabled={actionLoading === m.id}
                            className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-medium transition-colors"
                          >
                            {actionLoading === m.id ? '…' : 'Approve'}
                          </button>
                          <button
                            onClick={() => rejectMigration(m.id)}
                            disabled={actionLoading === m.id}
                            className="px-3 py-1.5 rounded bg-red-900/60 hover:bg-red-800 disabled:opacity-40 text-red-300 text-xs font-medium transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── USERS ── */}
            {tab === 'users' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-zinc-300">All Users</h2>
                  <span className="text-xs text-zinc-600 font-mono">{users.length} records</span>
                </div>
                {users.length === 0 && <p className="text-zinc-600 text-sm">No users yet.</p>}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#1E2A3B] text-zinc-500 text-left">
                        <th className="pb-2 pr-4 font-medium">Name</th>
                        <th className="pb-2 pr-4 font-medium">Email</th>
                        <th className="pb-2 pr-4 font-medium">KYC</th>
                        <th className="pb-2 pr-4 font-medium">Status</th>
                        <th className="pb-2 font-medium">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u, i) => (
                        <tr key={u.id} className={`border-b border-[#1E2A3B]/50 ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                          <td className="py-2.5 pr-4 text-white font-medium">{u.full_name}</td>
                          <td className="py-2.5 pr-4 text-zinc-400 font-mono">{u.email}</td>
                          <td className="py-2.5 pr-4"><Badge status={u.kyc_status} /></td>
                          <td className="py-2.5 pr-4">
                            <Badge status={u.is_suspended ? 'SUSPENDED' : u.is_active ? 'ACTIVE' : 'INACTIVE'} />
                          </td>
                          <td className="py-2.5 text-zinc-600">{fmtDate(u.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}