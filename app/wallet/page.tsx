'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/supabase/client'
import Link from 'next/link'

interface Wallet {
  available_balance: number
  locked_capital: number
  pending_release_capital: number
}

interface ReleasedContract {
  id: string
  plan_tier: string
  principal_amount: number
  released_at: string
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)

const NETWORKS = ['TRC20', 'ERC20', 'BTC', 'BEP20']

export default function WalletPage() {
  const supabase = createClient()
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [releasedContracts, setReleasedContracts] = useState<ReleasedContract[]>([])
  const [loading, setLoading] = useState(true)

  // form state
  const [withdrawType, setWithdrawType] = useState<'PROFIT' | 'CAPITAL'>('PROFIT')
  const [amount, setAmount] = useState('')
  const [network, setNetwork] = useState('TRC20')
  const [walletAddress, setWalletAddress] = useState('')
  const [selectedContractId, setSelectedContractId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [walletRes, contractsRes] = await Promise.all([
      supabase.from('wc_wallet_balances').select('available_balance, locked_capital, pending_release_capital').eq('user_id', user.id).single(),
      supabase.from('wc_contracts').select('id, plan_tier, principal_amount, released_at').eq('user_id', user.id).eq('state', 'RELEASED'),
    ])
    setWallet(walletRes.data as Wallet)
    setReleasedContracts((contractsRes.data as ReleasedContract[]) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function submit() {
    setError('')
    setSuccess('')
    if (!walletAddress.trim()) { setError('Wallet address is required'); return }
    if (!amount || Number(amount) <= 0) { setError('Enter a valid amount'); return }
    if (withdrawType === 'CAPITAL' && !selectedContractId) { setError('Select the contract to withdraw capital from'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/withdrawals/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          withdrawal_type: withdrawType,
          amount,
          destination_details: { wallet_address: walletAddress, network },
          contract_id: withdrawType === 'CAPITAL' ? selectedContractId : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess(`Withdrawal request submitted. ID: ${data.withdrawal.id}`)
      setAmount('')
      setWalletAddress('')
      setSelectedContractId('')
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const maxAmount = withdrawType === 'PROFIT'
    ? wallet?.available_balance ?? 0
    : releasedContracts.find(c => c.id === selectedContractId)?.principal_amount ?? 0

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center">
        <div className="text-zinc-600 text-sm">Loading wallet…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white">

      <nav className="border-b border-[#1E2A3B] sticky top-0 z-40 bg-[#0A0F1E]/95 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-amber-500 flex items-center justify-center">
              <span className="text-black text-xs font-black">W</span>
            </div>
            <span className="font-semibold">Wallet</span>
          </div>
          <Link href="/dashboard" className="text-xs text-zinc-400 hover:text-white transition-colors">← Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* balances */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3 sm:col-span-1 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="text-xs text-amber-400/70 uppercase tracking-widest mb-1">Available</p>
            <p className="text-2xl font-mono font-bold text-amber-400">{fmt(wallet?.available_balance ?? 0)}</p>
            <p className="text-xs text-zinc-600 mt-1">Profit + released capital</p>
          </div>
          <div className="rounded-xl border border-[#1E2A3B] bg-[#111827] p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Locked</p>
            <p className="text-lg font-mono font-semibold text-white">{fmt(wallet?.locked_capital ?? 0)}</p>
            <p className="text-xs text-zinc-600 mt-1">In contracts</p>
          </div>
          <div className="rounded-xl border border-[#1E2A3B] bg-[#111827] p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Releasing</p>
            <p className="text-lg font-mono font-semibold text-white">{fmt(wallet?.pending_release_capital ?? 0)}</p>
            <p className="text-xs text-zinc-600 mt-1">In delay queue</p>
          </div>
        </div>

        {/* withdrawal form */}
        <div className="rounded-xl border border-[#1E2A3B] bg-[#111827] p-6 space-y-5">
          <h2 className="text-sm font-semibold text-white">Request Withdrawal</h2>

          {/* type toggle */}
          <div className="flex rounded-lg border border-[#1E2A3B] overflow-hidden">
            {(['PROFIT', 'CAPITAL'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setWithdrawType(t); setAmount(''); setSelectedContractId('') }}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors
                  ${withdrawType === t ? 'bg-amber-500 text-black' : 'text-zinc-500 hover:text-white'}`}
              >
                {t === 'PROFIT' ? 'Profit Withdrawal' : 'Capital Withdrawal'}
              </button>
            ))}
          </div>

          {withdrawType === 'CAPITAL' && releasedContracts.length === 0 && (
            <div className="p-3 rounded-lg border border-[#1E2A3B] bg-[#0A0F1E] text-xs text-zinc-500">
              No released capital available. Capital becomes withdrawable after the release delay period expires.
            </div>
          )}

          {withdrawType === 'CAPITAL' && releasedContracts.length > 0 && (
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-widest block mb-1.5">Select Contract</label>
              <select
                value={selectedContractId}
                onChange={e => {
                  setSelectedContractId(e.target.value)
                  const c = releasedContracts.find(r => r.id === e.target.value)
                  if (c) setAmount(String(c.principal_amount))
                }}
                className="w-full bg-[#0A0F1E] border border-[#1E2A3B] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500/60"
              >
                <option value="">— Select contract —</option>
                {releasedContracts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.plan_tier.replace('WERTCHAIN_', '')} · {fmt(c.principal_amount)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-widest block mb-1.5">Amount (USD)</label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                max={maxAmount}
                step="0.01"
                disabled={withdrawType === 'CAPITAL' && !selectedContractId}
                className="w-full bg-[#0A0F1E] border border-[#1E2A3B] rounded-lg px-4 py-3 text-white font-mono text-lg focus:outline-none focus:border-amber-500/60 disabled:opacity-40"
                placeholder="0.00"
              />
              {maxAmount > 0 && (
                <button
                  onClick={() => setAmount(String(maxAmount))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-400 hover:text-amber-300"
                >
                  MAX
                </button>
              )}
            </div>
            {maxAmount > 0 && (
              <p className="text-xs text-zinc-600 mt-1">Available: {fmt(maxAmount)}</p>
            )}
          </div>

          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-widest block mb-1.5">Network</label>
            <div className="flex gap-2 flex-wrap">
              {NETWORKS.map(n => (
                <button
                  key={n}
                  onClick={() => setNetwork(n)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors
                    ${network === n ? 'border-amber-500/60 bg-amber-500/10 text-amber-400' : 'border-[#1E2A3B] text-zinc-500 hover:border-zinc-600'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-widest block mb-1.5">Your Wallet Address</label>
            <input
              type="text"
              value={walletAddress}
              onChange={e => setWalletAddress(e.target.value)}
              className="w-full bg-[#0A0F1E] border border-[#1E2A3B] rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-amber-500/60"
              placeholder={`Your ${network} wallet address`}
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          {success && <p className="text-emerald-400 text-sm">{success}</p>}

          <button
            onClick={submit}
            disabled={submitting || !amount || !walletAddress || Number(amount) <= 0}
            className="w-full py-3 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold transition-colors"
          >
            {submitting ? 'Submitting…' : 'Request Withdrawal'}
          </button>

          <p className="text-xs text-zinc-600 text-center">
            Withdrawals are reviewed by our team within 48 hours.
          </p>
        </div>
      </div>
    </div>
  )
}