"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const C = {
  base: "#0A0F1E", surface: "#0F1629", card: "#131C35", border: "#1E2D50",
  gold: "#F0B429", text: "#E8EDF5", muted: "#6B7A99", green: "#22C55E", red: "#EF4444",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

interface Plan {
  id: string;
  name: string;
  daily_rate: number;
  duration_days: number;
  min_amount: number;
  max_amount: number | null;
  description: string | null;
  is_active: boolean;
  currency: string;
}

interface Wallet {
  available_balance: number;
  currency: string;
}

export default function InvestPage() {
  const supabase = createClient();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [selected, setSelected] = useState<Plan | null>(null);
  const [amount, setAmount] = useState("");
  const [reinvest, setReinvest] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/auth/login"; return; }

    const [plansRes, walletRes] = await Promise.all([
      supabase.from("wc_investment_plans").select("*").eq("is_active", true).order("min_amount"),
      supabase.from("wc_wallet_balances").select("available_balance, currency").eq("user_id", user.id).single(),
    ]);

    setPlans(plansRes.data || []);
    setWallet(walletRes.data);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const totalReturn = (p: Plan, amt: number) => amt + (amt * p.daily_rate / 100 * p.duration_days);
  const totalProfit = (p: Plan, amt: number) => amt * p.daily_rate / 100 * p.duration_days;

  const handleInvest = async () => {
    if (!selected || !amount) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < selected.min_amount) { setError(`Minimum investment is $${fmt(selected.min_amount)}`); return; }
    if (selected.max_amount && amt > selected.max_amount) { setError(`Maximum investment is $${fmt(selected.max_amount)}`); return; }
    if (wallet && amt > Number(wallet.available_balance)) { setError("Insufficient wallet balance"); return; }

    setSubmitting(true);
    setError("");
    const res = await fetch("/api/contracts/create", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan_id: selected.id, amount: amt, auto_reinvest: reinvest }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (data.success) { setSuccess(true); setSelected(null); setAmount(""); }
    else setError(data.error || "Failed to create contract");
  };

  if (success) return (
    <div style={{ minHeight: "100vh", background: C.base, color: C.text, fontFamily: "Inter, system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 48, textAlign: "center", maxWidth: 420 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.green, marginBottom: 12 }}>Investment Created</h2>
        <p style={{ color: C.muted, marginBottom: 24 }}>Your plan is active. Profits accrue daily starting tomorrow.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Link href="/dashboard" style={{ background: C.gold, color: C.base, padding: "10px 20px", borderRadius: 8, fontWeight: 700, textDecoration: "none" }}>Dashboard</Link>
          <button onClick={() => setSuccess(false)} style={{ background: "none", border: `1px solid ${C.border}`, color: C.text, padding: "10px 20px", borderRadius: 8, cursor: "pointer" }}>Invest Again</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.base, color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <header style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 26, height: 26, background: C.gold, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13, color: C.base }}>W</div>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Wertchain</span>
          </div>
          <nav style={{ display: "flex", gap: 4 }}>
            {[{ href: "/dashboard", label: "Dashboard" }, { href: "/invest", label: "Invest" }, { href: "/wallet", label: "Wallet" }].map(n => (
              <Link key={n.href} href={n.href} style={{ color: n.href === "/invest" ? C.gold : C.muted, fontSize: 13, fontWeight: 500, padding: "6px 14px", borderRadius: 6, textDecoration: "none" }}>{n.label}</Link>
            ))}
          </nav>
          <Link href="/wallet" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 14px", fontSize: 13, color: C.gold, fontWeight: 700, textDecoration: "none", fontFamily: "monospace" }}>
            ${fmt(Number(wallet?.available_balance || 0))}
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Investment Plans</h1>
          <p style={{ color: C.muted, fontSize: 14 }}>Choose a plan and start earning daily returns.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, marginBottom: 40 }}>
          {plans.map(p => {
            const isSelected = selected?.id === p.id;
            return (
              <div key={p.id} onClick={() => { setSelected(isSelected ? null : p); setAmount(String(p.min_amount)); setError(""); }} style={{ background: isSelected ? `${C.gold}0A` : C.card, border: `1px solid ${isSelected ? C.gold : C.border}`, borderRadius: 14, padding: 28, cursor: "pointer", position: "relative" }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4, color: isSelected ? C.gold : C.text }}>{p.name}</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                  {[
                    { label: "Daily Rate", value: `${p.daily_rate}%` },
                    { label: "Duration", value: `${p.duration_days} days` },
                    { label: "Min. Amount", value: `$${fmt(p.min_amount)}` },
                    { label: "Max. Amount", value: p.max_amount ? `$${fmt(p.max_amount)}` : "Unlimited" },
                  ].map(s => (
                    <div key={s.label} style={{ background: `${C.border}55`, borderRadius: 8, padding: "10px 12px" }}>
                      <p style={{ color: C.muted, fontSize: 10, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>{s.label}</p>
                      <p style={{ color: C.text, fontWeight: 700, fontSize: 14, fontFamily: "monospace" }}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {selected && (
          <div style={{ background: C.card, border: `1px solid ${C.gold}`, borderRadius: 16, padding: 32, maxWidth: 500 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Invest in {selected.name}</h3>
            <div style={{ marginBottom: 20 }}>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.gold, fontWeight: 700 }}>$</span>
                <input type="number" value={amount} onChange={e => { setAmount(e.target.value); setError(""); }} min={selected.min_amount} style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px 12px 28px", color: C.text, fontSize: 16, fontFamily: "monospace", boxSizing: "border-box", outline: "none" }} />
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, cursor: "pointer" }}><input type="checkbox" checked={reinvest} onChange={e => setReinvest(e.target.checked)} style={{ width: 16, height: 16, accentColor: C.gold }} /><span style={{ fontSize: 13, color: C.muted }}>Auto-reinvest at maturity</span></label>
            {error && <p style={{ color: C.red, fontSize: 13, marginBottom: 16 }}>{error}</p>}
            <button onClick={handleInvest} disabled={submitting || !amount} style={{ width: "100%", background: submitting ? C.border : C.gold, color: C.base, border: "none", borderRadius: 10, padding: "14px", fontSize: 15, fontWeight: 800, cursor: submitting ? "not-allowed" : "pointer" }}>{submitting ? "Creating…" : "Confirm Investment"}</button>
          </div>
        )}
      </main>
    </div>
  );
}
