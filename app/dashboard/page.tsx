"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const C = {
  base: "#0A0F1E", surface: "#0F1629", card: "#131C35", border: "#1E2D50",
  gold: "#F0B429", text: "#E8EDF5", muted: "#6B7A99",
  green: "#22C55E", red: "#EF4444", amber: "#F59E0B",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

interface Contract {
  id: string;
  plan_id: string;
  status: string;
  invested_amount: number;
  accrued_profit: number;
  start_date: string;
  maturity_date: string;
  wc_investment_plans?: { name: string; daily_rate: number };
}

interface Transaction {
  id: string;
  created_at: string;
  amount: number;
  direction: string;
  description: string;
}

interface Wallet {
  available_balance: number;
  locked_balance: number;
  currency: string;
}

interface User {
  full_name: string;
  email: string;
  kyc_status: string;
}

function daysLeft(maturity: string) {
  const diff = new Date(maturity).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function progressPct(start: string, maturity: string) {
  const total = new Date(maturity).getTime() - new Date(start).getTime();
  const elapsed = Date.now() - new Date(start).getTime();
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

function statusColor(s: string) {
  if (["active"].includes(s)) return C.green;
  if (["pending", "pending_deposit"].includes(s)) return C.amber;
  if (["matured"].includes(s)) return C.gold;
  if (["cancelled", "failed"].includes(s)) return C.red;
  return C.muted;
}

export default function Dashboard() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { window.location.href = "/auth/login"; return; }

    const [userRes, walletRes, contractsRes, txnsRes] = await Promise.all([
      supabase.from("wc_users").select("full_name, email, kyc_status").eq("id", authUser.id).single(),
      supabase.from("wc_wallet_balances").select("available_balance, locked_balance, currency").eq("user_id", authUser.id).single(),
      supabase.from("wc_contracts").select("*, wc_investment_plans(name, daily_rate)").eq("user_id", authUser.id).order("created_at", { ascending: false }),
      supabase.from("wc_ledger_transactions").select("id, created_at, amount, direction, description").eq("user_id", authUser.id).order("created_at", { ascending: false }).limit(10),
    ]);

    setUser(userRes.data);
    setWallet(walletRes.data);
    setContracts(contractsRes.data || []);
    setTxns(txnsRes.data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const totalInvested = contracts.filter(c => c.status === "active").reduce((s, c) => s + Number(c.invested_amount), 0);
  const totalProfit = contracts.reduce((s, c) => s + Number(c.accrued_profit), 0);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.base, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontFamily: "Inter, system-ui, sans-serif" }}>
      Loading…
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.base, color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Nav */}
      <header style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 26, height: 26, background: C.gold, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13, color: C.base }}>W</div>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Wertchain</span>
          </div>
          <nav style={{ display: "flex", gap: 4 }}>
            {[
              { href: "/dashboard", label: "Dashboard" },
              { href: "/invest", label: "Invest" },
              { href: "/wallet", label: "Wallet" },
            ].map(n => (
              <Link key={n.href} href={n.href} style={{ color: C.muted, fontSize: 13, fontWeight: 500, padding: "6px 14px", borderRadius: 6, textDecoration: "none", transition: "all 0.15s" }}
                onMouseEnter={e => { (e.target as HTMLElement).style.color = C.text; (e.target as HTMLElement).style.background = C.card; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.color = C.muted; (e.target as HTMLElement).style.background = "transparent"; }}>
                {n.label}
              </Link>
            ))}
          </nav>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = "/auth/login"; }}
            style={{ color: C.muted, background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>
            Sign out
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        {/* Greeting */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 4 }}>Welcome back</p>
          <h1 style={{ fontSize: 26, fontWeight: 700 }}>{user?.full_name || "—"}</h1>
          {user?.kyc_status !== "approved" && (
            <div style={{ marginTop: 12, background: `${C.amber}18`, border: `1px solid ${C.amber}44`, borderRadius: 8, padding: "10px 16px", fontSize: 13, color: C.amber, display: "inline-flex", gap: 8, alignItems: "center" }}>
              ⚠ KYC verification pending — some features may be limited
            </div>
          )}
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
          {[
            { label: "Available Balance", value: `$${fmt(Number(wallet?.available_balance || 0))}`, accent: true },
            { label: "Locked in Plans", value: `$${fmt(Number(wallet?.locked_balance || 0))}` },
            { label: "Active Invested", value: `$${fmt(totalInvested)}` },
            { label: "Total Profit Earned", value: `$${fmt(totalProfit)}` },
          ].map(s => (
            <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 22px", borderLeft: s.accent ? `3px solid ${C.gold}` : undefined }}>
              <p style={{ color: C.muted, fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{s.label}</p>
              <p style={{ color: s.accent ? C.gold : C.text, fontSize: 22, fontWeight: 700, fontFamily: "monospace" }}>{s.value}</p>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>
          {/* Contracts */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Active Investments</h2>
              <Link href="/invest" style={{ color: C.gold, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>+ New Plan →</Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {contracts.length === 0 && (
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 40, textAlign: "center" }}>
                  <p style={{ color: C.muted, marginBottom: 16 }}>No investments yet</p>
                  <Link href="/invest" style={{ background: C.gold, color: C.base, padding: "10px 20px", borderRadius: 8, fontWeight: 700, textDecoration: "none", fontSize: 14 }}>Start Investing</Link>
                </div>
              )}
              {contracts.map(c => {
                const pct = progressPct(c.start_date, c.maturity_date);
                const left = daysLeft(c.maturity_date);
                return (
                  <div key={c.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{c.wc_investment_plans?.name || "Plan"}</p>
                        <p style={{ color: C.muted, fontSize: 12 }}>{c.wc_investment_plans?.daily_rate}% daily</p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ color: C.gold, fontWeight: 700, fontSize: 16, fontFamily: "monospace" }}>${fmt(Number(c.invested_amount))}</p>
                        <span style={{
                          background: `${statusColor(c.status)}22`, color: statusColor(c.status),
                          border: `1px solid ${statusColor(c.status)}44`,
                          padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                        }}>{c.status.toUpperCase()}</span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    {c.status === "active" && (
                      <div>
                        <div style={{ background: C.border, borderRadius: 4, height: 4, marginBottom: 8 }}>
                          <div style={{ background: C.gold, width: `${pct}%`, height: 4, borderRadius: 4, transition: "width 0.5s" }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted }}>
                          <span>{pct}% complete</span>
                          <span>{left} day{left !== 1 ? "s" : ""} left · Profit: <span style={{ color: C.green }}>${fmt(Number(c.accrued_profit))}</span></span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Transactions */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Recent Activity</h2>
              <Link href="/wallet" style={{ color: C.gold, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>All →</Link>
            </div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
              {txns.length === 0 && (
                <p style={{ color: C.muted, fontSize: 13, padding: 24, textAlign: "center" }}>No transactions yet</p>
              )}
              {txns.map((t, i) => (
                <div key={t.id} style={{
                  padding: "14px 18px", borderBottom: i < txns.length - 1 ? `1px solid ${C.border}` : undefined,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{t.description}</p>
                    <p style={{ color: C.muted, fontSize: 11 }}>{new Date(t.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</p>
                  </div>
                  <span style={{
                    color: t.direction === "credit" ? C.green : C.red,
                    fontFamily: "monospace", fontWeight: 700, fontSize: 13,
                  }}>
                    {t.direction === "credit" ? "+" : "−"}${fmt(Number(t.amount))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
