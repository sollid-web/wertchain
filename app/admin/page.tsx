"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

type Tab = "overview" | "deposits" | "withdrawals" | "migrations" | "users";

interface Stats {
  totalUsers: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  activeContracts: number;
  totalAUM: number;
  todayDeposits: number;
}

interface Deposit {
  id: string;
  created_at: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  payment_reference: string | null;
  user_id: string;
  wc_users?: { full_name: string; email: string };
}

interface Withdrawal {
  id: string;
  created_at: string;
  amount: number;
  currency: string;
  status: string;
  destination_address: string;
  user_id: string;
  wc_users?: { full_name: string; email: string };
}

interface User {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  status: string;
  kyc_status: string;
  wc_wallet_balances?: { available_balance: number; currency: string }[];
}

const C = {
  base: "#0A0F1E", surface: "#0F1629", card: "#131C35", border: "#1E2D50",
  gold: "#F0B429", goldDim: "#C48E1A", text: "#E8EDF5", muted: "#6B7A99",
  green: "#22C55E", red: "#EF4444", amber: "#F59E0B", blue: "#3B82F6",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const statusColor = (s: string) => {
  if (["approved", "completed", "active"].includes(s)) return C.green;
  if (["pending", "pending_approval"].includes(s)) return C.amber;
  if (["rejected", "cancelled", "failed"].includes(s)) return C.red;
  return C.muted;
};

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 24px",
      borderLeft: accent ? `3px solid ${C.gold}` : undefined,
    }}>
      <p style={{ color: C.muted, fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{label}</p>
      <p style={{ color: accent ? C.gold : C.text, fontSize: 26, fontWeight: 700, fontFamily: "monospace" }}>{value}</p>
      {sub && <p style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

function Badge({ status }: { status: string }) {
  return (
    <span style={{
      background: `${statusColor(status)}22`, color: statusColor(status),
      border: `1px solid ${statusColor(status)}44`,
      padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
    }}>{status.replace(/_/g, " ")}</span>
  );
}

function ActionBtn({ label, color, onClick, disabled }: { label: string; color: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? "#1E2D50" : `${color}22`,
        color: disabled ? C.muted : color,
        border: `1px solid ${disabled ? C.border : color + "55"}`,
        padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.15s",
      }}
    >{label}</button>
  );
}

export default function AdminPanel() {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const loadStats = useCallback(async () => {
    const [usersRes, depositsRes, withdrawalsRes, contractsRes] = await Promise.all([
      supabase.from("wc_users").select("id", { count: "exact", head: true }),
      supabase.from("wc_deposits").select("id, amount", { count: "exact" }).eq("status", "pending_approval"),
      supabase.from("wc_withdrawals").select("id", { count: "exact", head: true }).eq("status", "pending_approval"),
      supabase.from("wc_contracts").select("id, invested_amount", { count: "exact" }).eq("status", "active"),
    ]);

    const aum = (contractsRes.data || []).reduce((s: number, c: { invested_amount: number }) => s + Number(c.invested_amount), 0);
    const pendingDepsAmount = (depositsRes.data || []).reduce((s: number, d: { amount: number }) => s + Number(d.amount), 0);

    setStats({
      totalUsers: usersRes.count || 0,
      pendingDeposits: depositsRes.count || 0,
      pendingWithdrawals: withdrawalsRes.count || 0,
      activeContracts: contractsRes.count || 0,
      totalAUM: aum,
      todayDeposits: pendingDepsAmount,
    });
  }, [supabase]);

  const loadDeposits = useCallback(async () => {
    const { data } = await supabase.from("wc_deposits").select("*, wc_users(full_name, email)").order("created_at", { ascending: false }).limit(50);
    setDeposits(data || []);
  }, [supabase]);

  const loadWithdrawals = useCallback(async () => {
    const { data } = await supabase.from("wc_withdrawals").select("*, wc_users(full_name, email)").order("created_at", { ascending: false }).limit(50);
    setWithdrawals(data || []);
  }, [supabase]);

  const loadUsers = useCallback(async () => {
    const { data } = await supabase.from("wc_users").select("*, wc_wallet_balances(available_balance, currency)").order("created_at", { ascending: false }).limit(100);
    setUsers(data || []);
  }, [supabase]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadStats();
      await Promise.all([loadDeposits(), loadWithdrawals(), loadUsers()]);
      setLoading(false);
    })();
  }, [loadStats, loadDeposits, loadWithdrawals, loadUsers]);

  const approveDeposit = async (id: string) => {
    setActionLoading(id);
    const res = await fetch("/api/admin/approve-deposit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deposit_id: id }) });
    const data = await res.json();
    setActionLoading(null);
    if (data.success) { showToast("Deposit approved", true); await loadDeposits(); await loadStats(); }
    else showToast(data.error || "Failed", false);
  };

  const rejectDeposit = async (id: string) => {
    setActionLoading(id + "_reject");
    const res = await fetch("/api/admin/reject-deposit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deposit_id: id }) });
    const data = await res.json();
    setActionLoading(null);
    if (data.success) { showToast("Deposit rejected", true); await loadDeposits(); }
    else showToast(data.error || "Failed", false);
  };

  const approveWithdrawal = async (id: string) => {
    setActionLoading(id);
    const res = await fetch("/api/admin/approve-withdrawal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ withdrawal_id: id }) });
    const data = await res.json();
    setActionLoading(null);
    if (data.success) { showToast("Withdrawal approved", true); await loadWithdrawals(); await loadStats(); }
    else showToast(data.error || "Failed", false);
  };

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "deposits", label: "Deposits", count: stats?.pendingDeposits },
    { key: "withdrawals", label: "Withdrawals", count: stats?.pendingWithdrawals },
    { key: "migrations", label: "Migrations" },
    { key: "users", label: "Users" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.base, color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {toast && <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: toast.ok ? `${C.green}22` : `${C.red}22`, border: `1px solid ${toast.ok ? C.green : C.red}`, color: toast.ok ? C.green : C.red, padding: "12px 20px", borderRadius: 8, fontWeight: 600, fontSize: 14 }}>{toast.msg}</div>}

      <header style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 32px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 28, height: 28, background: C.gold, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, color: C.base }}>W</div>
            <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "0.02em" }}>Wertchain</span>
            <span style={{ color: C.gold, fontSize: 12, background: `${C.gold}22`, border: `1px solid ${C.gold}44`, padding: "2px 8px", borderRadius: 4, fontWeight: 600, marginLeft: 4 }}>ADMIN</span>
          </div>
          <div style={{ color: C.muted, fontSize: 13 }}>{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
        </div>
      </header>

      <nav style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 32px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", gap: 0 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ background: "none", border: "none", cursor: "pointer", padding: "14px 20px", fontSize: 13, fontWeight: 600, color: tab === t.key ? C.gold : C.muted, borderBottom: `2px solid ${tab === t.key ? C.gold : "transparent"}`, display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s" }}>
              {t.label} {t.count ? <span style={{ background: C.gold, color: C.base, borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>{t.count}</span> : null}
            </button>
          ))}
        </div>
      </nav>

      <main style={{ maxWidth: 1400, margin: "0 auto", padding: "32px" }}>
        {loading ? (
          <div style={{ textAlign: "center", color: C.muted, padding: 80 }}>Loading...</div>
        ) : (
          <>
            {tab === "overview" && stats && (
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Platform Overview</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
                  <StatCard label="Total AUM" value={`$${fmt(stats.totalAUM)}`} accent />
                  <StatCard label="Active Contracts" value={stats.activeContracts} />
                  <StatCard label="Total Users" value={stats.totalUsers} />
                  <StatCard label="Pending Deposits" value={stats.pendingDeposits} sub={`$${fmt(stats.todayDeposits)} awaiting`} />
                  <StatCard label="Pending Withdrawals" value={stats.pendingWithdrawals} />
                </div>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: C.muted, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>Quick Actions Needed</h3>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {stats.pendingDeposits > 0 && <button onClick={() => setTab("deposits")} style={{ background: `${C.gold}22`, color: C.gold, border: `1px solid ${C.gold}55`, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Review {stats.pendingDeposits} Deposit{stats.pendingDeposits > 1 ? "s" : ""}</button>}
                    {stats.pendingWithdrawals > 0 && <button onClick={() => setTab("withdrawals")} style={{ background: `${C.blue}22`, color: C.blue, border: `1px solid ${C.blue}55`, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Review {stats.pendingWithdrawals} Withdrawal{stats.pendingWithdrawals > 1 ? "s" : ""}</button>}
                    {stats.pendingDeposits === 0 && stats.pendingWithdrawals === 0 && <p style={{ color: C.green, fontSize: 14 }}>✓ All caught up — no pending actions</p>}
                  </div>
                </div>
              </div>
            )}

            {tab === "deposits" && (
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Deposits</h2>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                        {["User", "Amount", "Method", "Reference", "Status", "Date", "Actions"].map(h => <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.muted, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {deposits.map(d => (
                        <tr key={d.id} style={{ borderBottom: `1px solid ${C.border}22` }}>
                          <td style={{ padding: "12px 14px" }}><div style={{ fontWeight: 600 }}>{d.wc_users?.full_name || "—"}</div><div style={{ color: C.muted, fontSize: 11 }}>{d.wc_users?.email}</div></td>
                          <td style={{ padding: "12px 14px", fontFamily: "monospace", fontWeight: 700, color: C.gold }}>${fmt(d.amount)}</td>
                          <td style={{ padding: "12px 14px", color: C.muted }}>{d.payment_method}</td>
                          <td style={{ padding: "12px 14px", color: C.muted, fontFamily: "monospace", fontSize: 11 }}>{d.payment_reference || "—"}</td>
                          <td style={{ padding: "12px 14px" }}><Badge status={d.status} /></td>
                          <td style={{ padding: "12px 14px", color: C.muted, fontSize: 11 }}>{fmtDate(d.created_at)}</td>
                          <td style={{ padding: "12px 14px" }}>
                            {d.status === "pending_approval" && (
                              <div style={{ display: "flex", gap: 8 }}>
                                <ActionBtn label="Approve" color={C.green} onClick={() => approveDeposit(d.id)} disabled={actionLoading === d.id} />
                                <ActionBtn label="Reject" color={C.red} onClick={() => rejectDeposit(d.id)} disabled={actionLoading === d.id + "_reject"} />
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === "withdrawals" && (
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Withdrawals</h2>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      {["User", "Amount", "Destination", "Status", "Date", "Actions"].map(h => <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.muted, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map(w => (
                      <tr key={w.id} style={{ borderBottom: `1px solid ${C.border}22` }}>
                        <td style={{ padding: "12px 14px" }}><div style={{ fontWeight: 600 }}>{w.wc_users?.full_name || "—"}</div><div style={{ color: C.muted, fontSize: 11 }}>{w.wc_users?.email}</div></td>
                        <td style={{ padding: "12px 14px", fontFamily: "monospace", fontWeight: 700, color: C.gold }}>${fmt(w.amount)}</td>
                        <td style={{ padding: "12px 14px", fontFamily: "monospace", fontSize: 11, color: C.muted }}>{w.destination_address}</td>
                        <td style={{ padding: "12px 14px" }}><Badge status={w.status} /></td>
                        <td style={{ padding: "12px 14px", color: C.muted, fontSize: 11 }}>{fmtDate(w.created_at)}</td>
                        <td style={{ padding: "12px 14px" }}>{w.status === "pending_approval" && <ActionBtn label="Approve" color={C.green} onClick={() => approveWithdrawal(w.id)} disabled={actionLoading === w.id} />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === "migrations" && (
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Plan Migrations</h2>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 40, textAlign: "center", color: C.muted }}>Migration review queue — connect to wc_migrations table.</div>
              </div>
            )}

            {tab === "users" && (
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Users</h2>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      {["Name", "Email", "Balance", "KYC", "Status", "Joined"].map(h => <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.muted, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}22` }}>
                        <td style={{ padding: "12px 14px", fontWeight: 600 }}>{u.full_name}</td>
                        <td style={{ padding: "12px 14px", color: C.muted }}>{u.email}</td>
                        <td style={{ padding: "12px 14px", fontFamily: "monospace", color: C.gold }}>${fmt(u.wc_wallet_balances?.[0]?.available_balance || 0)}</td>
                        <td style={{ padding: "12px 14px" }}><Badge status={u.kyc_status} /></td>
                        <td style={{ padding: "12px 14px" }}><Badge status={u.status} /></td>
                        <td style={{ padding: "12px 14px", color: C.muted, fontSize: 11 }}>{fmtDate(u.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
