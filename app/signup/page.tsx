'use client'

import { useState } from 'react'
import { createClient } from '@/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const supabase = createClient()
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function signup() {
    setError('')
    if (!fullName.trim()) { setError('Full name is required'); return }
    if (!email) { setError('Email is required'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }

    setLoading(true)
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName.trim() } },
    })
    setLoading(false)
    if (authError) {
      setError(authError.message)
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center mx-auto">
            <span className="text-white text-xl">✓</span>
          </div>
          <h1 className="text-white text-xl font-semibold">Check your email</h1>
          <p className="text-zinc-500 text-sm">
            We sent a confirmation link to <span className="text-white">{email}</span>.
            Click it to activate your account then sign in.
          </p>
          <Link href="/login" className="inline-block mt-4 px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors">
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center mx-auto">
            <span className="text-black text-xl font-black">W</span>
          </div>
          <h1 className="text-white text-xl font-semibold">Create your account</h1>
          <p className="text-zinc-500 text-sm">Join Wertchain and start investing</p>
        </div>

        <div className="rounded-xl border border-[#1E2A3B] bg-[#111827] p-6 space-y-4">
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-widest block mb-1.5">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full bg-[#0A0F1E] border border-[#1E2A3B] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500/60 transition-colors"
              placeholder="John Doe"
              autoComplete="name"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-widest block mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
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
              className="w-full bg-[#0A0F1E] border border-[#1E2A3B] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500/60 transition-colors"
              placeholder="Min 8 characters"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-widest block mb-1.5">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && signup()}
              className="w-full bg-[#0A0F1E] border border-[#1E2A3B] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500/60 transition-colors"
              placeholder="Repeat password"
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs">
              {error}
            </div>
          )}

          <button
            onClick={signup}
            disabled={loading}
            className="w-full py-3 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold transition-colors"
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </div>

        <p className="text-center text-sm text-zinc-500">
          Already have an account?{' '}
          <Link href="/login" className="text-amber-400 hover:text-amber-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}