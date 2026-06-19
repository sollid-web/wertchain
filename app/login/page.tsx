'use client'

import { useState } from 'react'
import { createClient } from '@/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function login() {
    setError('')
    if (!email || !password) { setError('Email and password are required'); return }
    setLoading(true)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError(authError.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">

        {/* logo */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center mx-auto">
            <span className="text-black text-xl font-black">W</span>
          </div>
          <h1 className="text-white text-xl font-semibold">Sign in to Wertchain</h1>
          <p className="text-zinc-500 text-sm">Your investment portfolio awaits</p>
        </div>

        {/* form */}
        <div className="rounded-xl border border-[#1E2A3B] bg-[#111827] p-6 space-y-4">
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-widest block mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login()}
              className="w-full bg-[#0A0F1E] border border-[#1E2A3B] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500/60 transition-colors"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-widest block mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login()}
              className="w-full bg-[#0A0F1E] border border-[#1E2A3B] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500/60 transition-colors"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs">
              {error}
            </div>
          )}

          <button
            onClick={login}
            disabled={loading}
            className="w-full py-3 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </div>

        <p className="text-center text-sm text-zinc-500">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-amber-400 hover:text-amber-300 transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}