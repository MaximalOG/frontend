import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, RefreshCw, AlertCircle, Check, X,
  Loader2, Calendar, Server, Zap, Ban,
  ChevronDown, ChevronUp, Receipt, Clock,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Subscription {
  id: string;
  razorpaySubscriptionId: string;
  status: "created" | "active" | "pending_payment" | "halted" | "cancelled";
  planName: string;
  amountInr: number;
  nextBillingDate: string | null;
  currentPeriodEnd: string | null;
  gracePeriodEnd: string | null;
  createdAt: string;
  activatedAt: string | null;
  cancelledAt: string | null;
  serverId: string;
  serverName: string | null;
  serverStatus: string | null;
  serverHost: string | null;
}

interface PaymentHistoryEntry {
  razorpaySubscriptionId: string;
  razorpayPaymentId: string | null;
  amountInr: number | null;
  status: string;
  event: string;
  recordedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return "—"; }
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  active:          { label: "Active",          color: "#4ade80", bg: "rgba(74,222,128,0.08)",   border: "rgba(74,222,128,0.25)" },
  created:         { label: "Pending",         color: "#60a5fa", bg: "rgba(96,165,250,0.08)",   border: "rgba(96,165,250,0.25)" },
  pending_payment: { label: "Payment Due",     color: "#fbbf24", bg: "rgba(251,191,36,0.08)",   border: "rgba(251,191,36,0.25)" },
  halted:          { label: "Halted",          color: "#f87171", bg: "rgba(248,113,113,0.08)",  border: "rgba(248,113,113,0.25)" },
  cancelled:       { label: "Cancelled",       color: "#64748b", bg: "rgba(100,116,139,0.08)",  border: "rgba(100,116,139,0.25)" },
};

// ── Razorpay SDK loader ───────────────────────────────────────────────────────

function loadRazorpay(): Promise<boolean> {
  return new Promise(resolve => {
    if ((window as any).Razorpay) { resolve(true); return; }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

// ── Subscription Card ─────────────────────────────────────────────────────────

function SubCard({
  sub, token, onRefresh,
}: { sub: Subscription; token: () => string; onRefresh: () => void }) {
  const [expanded, setExpanded]       = useState(false);
  const [history, setHistory]         = useState<PaymentHistoryEntry[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);
  const [paying, setPaying]           = useState(false);
  const [payMsg, setPayMsg]           = useState("");
  const [payErr, setPayErr]           = useState("");
  const [cancelling, setCancelling]   = useState(false);
  const [showCancel, setShowCancel]   = useState(false);
  const [cancelErr, setCancelErr]     = useState("");

  const style = STATUS_STYLES[sub.status] ?? STATUS_STYLES.cancelled;
  const days  = daysUntil(sub.currentPeriodEnd);
  const canEarlyPay = sub.status === "active" || sub.status === "pending_payment";
  const canCancel   = sub.status !== "cancelled" && sub.status !== "halted";

  const loadHistory = async () => {
    setLoadingHist(true);
    try {
      const res = await apiFetch(`/api/servers/${sub.serverId}/subscription/history`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) setHistory(await res.json());
    } catch {}
    finally { setLoadingHist(false); }
  };

  const toggleExpand = () => {
    if (!expanded && history.length === 0) loadHistory();
    setExpanded(v => !v);
  };

  // ── Early payment ─────────────────────────────────────────────────────────

  const handleEarlyPay = async () => {
    setPaying(true); setPayErr(""); setPayMsg("");
    try {
      const loaded = await loadRazorpay();
      if (!loaded) { setPayErr("Razorpay failed to load. Please refresh."); return; }

      const orderRes = await apiFetch(
        `/api/servers/${sub.serverId}/subscription/early-renew/order`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` } }
      );
      let orderData: any = {};
      try { orderData = await orderRes.json(); } catch {}
      if (!orderRes.ok) { setPayErr(orderData.error || "Failed to create order."); return; }

      await new Promise<void>((resolve, reject) => {
        const rp = new (window as any).Razorpay({
          key:         orderData.keyId,
          order_id:    orderData.orderId,
          amount:      orderData.amount,
          currency:    "INR",
          name:        "NetherNodes",
          description: `Early Renewal — ${sub.planName} Plan`,
          prefill:     {},
          theme:       { color: "#e53935" },
          handler: async (response: any) => {
            try {
              const verifyRes = await apiFetch(
                `/api/servers/${sub.serverId}/subscription/early-renew/verify`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
                  body: JSON.stringify({
                    razorpay_order_id:   response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature:  response.razorpay_signature,
                  }),
                }
              );
              let vData: any = {};
              try { vData = await verifyRes.json(); } catch {}
              if (!verifyRes.ok) { setPayErr(vData.error || "Payment verification failed."); reject(new Error(vData.error)); return; }
              setPayMsg(`✓ Paid! Subscription extended to ${fmtDate(vData.newPeriodEnd)}.`);
              onRefresh();
              resolve();
            } catch (e: any) { reject(e); }
          },
          modal: { ondismiss: () => resolve() },
        });
        rp.open();
      });
    } catch (e: any) {
      if (!payMsg) setPayErr(e?.message || "Payment failed.");
    } finally { setPaying(false); }
  };

  // ── Cancel ────────────────────────────────────────────────────────────────

  const handleCancel = async () => {
    setCancelling(true); setCancelErr("");
    try {
      const res = await apiFetch(`/api/servers/${sub.serverId}/subscription/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ immediate: false }), // cancels at end of cycle
      });
      let d: any = {};
      try { d = await res.json(); } catch {}
      if (!res.ok) { setCancelErr(d.error || "Cancellation failed."); return; }
      setShowCancel(false);
      onRefresh();
    } catch { setCancelErr("Network error. Please try again."); }
    finally { setCancelling(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: "linear-gradient(135deg,#0d0d18,#0f0d1c)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* Main row */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">

          {/* Left: plan + server info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 mb-2 flex-wrap">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: style.bg, border: `1px solid ${style.border}` }}>
                <CreditCard size={14} style={{ color: style.color }} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold" style={{ color: "#f1f5f9" }}>{sub.planName} Plan</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}>
                    {style.label}
                  </span>
                </div>
                {sub.serverName && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Server size={9} style={{ color: "#475569" }} />
                    <Link to={`/server/${sub.serverId}/console`}
                      className="text-[10px] mono hover:underline"
                      style={{ color: "#475569" }}>
                      {sub.serverName}
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Key dates */}
            <div className="flex flex-wrap gap-4 mt-3">
              <div>
                <p className="text-[9px] mono uppercase tracking-widest mb-0.5" style={{ color: "#334155" }}>Monthly</p>
                <p className="text-sm font-bold" style={{ color: "#e2e8f0" }}>₹{sub.amountInr?.toLocaleString("en-IN")}</p>
              </div>
              {sub.currentPeriodEnd && (
                <div>
                  <p className="text-[9px] mono uppercase tracking-widest mb-0.5" style={{ color: "#334155" }}>Period ends</p>
                  <p className="text-xs font-semibold" style={{ color: days !== null && days <= 5 ? "#fbbf24" : "#e2e8f0" }}>
                    {fmtDate(sub.currentPeriodEnd)}
                    {days !== null && days > 0 && (
                      <span className="ml-1 text-[9px]" style={{ color: "#475569" }}>({days}d left)</span>
                    )}
                  </p>
                </div>
              )}
              {sub.nextBillingDate && sub.status === "active" && (
                <div>
                  <p className="text-[9px] mono uppercase tracking-widest mb-0.5" style={{ color: "#334155" }}>Next charge</p>
                  <p className="text-xs" style={{ color: "#94a3b8" }}>{fmtDate(sub.nextBillingDate)}</p>
                </div>
              )}
              {sub.gracePeriodEnd && (
                <div>
                  <p className="text-[9px] mono uppercase tracking-widest mb-0.5" style={{ color: "#f87171" }}>Grace ends</p>
                  <p className="text-xs font-semibold" style={{ color: "#f87171" }}>{fmtDate(sub.gracePeriodEnd)}</p>
                </div>
              )}
              {sub.cancelledAt && (
                <div>
                  <p className="text-[9px] mono uppercase tracking-widest mb-0.5" style={{ color: "#334155" }}>Cancelled</p>
                  <p className="text-xs" style={{ color: "#64748b" }}>{fmtDate(sub.cancelledAt)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex flex-col gap-2 shrink-0">
            {canEarlyPay && (
              <button onClick={handleEarlyPay} disabled={paying}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "white" }}>
                {paying ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                {paying ? "Processing…" : "Pay Early"}
              </button>
            )}
            {canCancel && (
              <button onClick={() => { setShowCancel(true); setCancelErr(""); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
                style={{ background: "rgba(239,68,68,0.08)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
                <Ban size={12} /> Cancel
              </button>
            )}
          </div>
        </div>

        {/* Feedback messages */}
        <AnimatePresence>
          {(payMsg || payErr) && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
              style={{
                background: payErr ? "rgba(239,68,68,0.08)" : "rgba(74,222,128,0.07)",
                border: `1px solid ${payErr ? "rgba(239,68,68,0.2)" : "rgba(74,222,128,0.2)"}`,
                color: payErr ? "#f87171" : "#4ade80",
              }}>
              {payErr ? <AlertCircle size={11} /> : <Check size={11} />}
              {payErr || payMsg}
              <button onClick={() => { setPayErr(""); setPayMsg(""); }} className="ml-auto"><X size={10} /></button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Expand / payment history toggle */}
      <button onClick={toggleExpand}
        className="w-full flex items-center justify-between px-5 py-2.5 text-[10px] mono uppercase tracking-widest transition-colors hover:bg-white/[0.02]"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)", color: "#334155" }}>
        <span className="flex items-center gap-1.5"><Receipt size={10} /> Payment History</span>
        {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
            <div className="px-5 pb-4">
              {loadingHist ? (
                <div className="flex items-center gap-2 py-4 text-xs" style={{ color: "#475569" }}>
                  <Loader2 size={12} className="animate-spin" /> Loading history…
                </div>
              ) : history.length === 0 ? (
                <p className="text-xs py-4" style={{ color: "#334155" }}>No payment events yet.</p>
              ) : (
                <div className="space-y-1 mt-1">
                  {history.map((h, i) => (
                    <div key={i} className="flex items-center justify-between py-2"
                      style={{ borderBottom: i < history.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{
                          background: h.status === "captured" || h.status === "early_renew" ? "#4ade80"
                            : h.status === "failed" ? "#f87171" : "#64748b"
                        }} />
                        <span className="text-xs capitalize" style={{ color: "#94a3b8" }}>
                          {h.status === "early_renew" ? "Early Renewal" : h.status.replace("_", " ")}
                        </span>
                        {h.razorpayPaymentId && (
                          <span className="text-[9px] mono" style={{ color: "#334155" }}>{h.razorpayPaymentId.slice(-8)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {h.amountInr != null && (
                          <span className="text-xs font-semibold" style={{ color: "#e2e8f0" }}>₹{h.amountInr.toLocaleString("en-IN")}</span>
                        )}
                        <span className="text-[10px]" style={{ color: "#475569" }}>
                          <Clock size={8} className="inline mr-1 opacity-50" />
                          {fmtDate(h.recordedAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel confirm modal */}
      <AnimatePresence>
        {showCancel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
            onClick={() => !cancelling && setShowCancel(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}
              style={{ background: "linear-gradient(135deg,#0f0f1a,#110d1d)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
                  <Ban size={18} style={{ color: "#f87171" }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "#f1f5f9" }}>Cancel subscription?</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#475569" }}>{sub.planName} — {sub.serverName}</p>
                </div>
              </div>
              <div className="rounded-xl px-3 py-2.5 mb-4 text-xs"
                style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.18)", color: "#92400e" }}>
                Your server stays active until <strong style={{ color: "#fbbf24" }}>{fmtDate(sub.currentPeriodEnd)}</strong>, then gets suspended. You can re-subscribe any time.
              </div>
              {cancelErr && <p className="text-xs mb-3" style={{ color: "#f87171" }}>{cancelErr}</p>}
              <div className="flex gap-2">
                <button onClick={() => setShowCancel(false)} disabled={cancelling}
                  className="flex-1 h-9 rounded-xl text-xs disabled:opacity-40"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#64748b" }}>Keep It</button>
                <button onClick={handleCancel} disabled={cancelling}
                  className="flex-1 h-9 flex items-center justify-center gap-2 rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-30"
                  style={{ background: "linear-gradient(135deg,#991b1b,#dc2626)", color: "white" }}>
                  {cancelling ? <Loader2 size={12} className="animate-spin" /> : <Ban size={12} />}
                  {cancelling ? "Cancelling…" : "Cancel Subscription"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Subscriptions() {
  const { user, loading: authLoading, token, logout } = useAuth();
  const navigate = useNavigate();

  const [subs, setSubs]       = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { state: { from: "/subscriptions" } });
  }, [authLoading, user, navigate]);

  const loadSubs = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await apiFetch("/api/subscriptions", {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.status === 401) { logout(); navigate("/login"); return; }
      if (!res.ok) { const e = await res.json(); setError(e.error || "Failed to load subscriptions."); return; }
      setSubs(await res.json());
    } catch { setError("Network error loading subscriptions."); }
    finally { setLoading(false); }
  }, [token, logout, navigate]);

  useEffect(() => { if (user) loadSubs(); }, [user, loadSubs]);

  if (authLoading) return null;

  const active    = subs.filter(s => s.status === "active");
  const attention = subs.filter(s => s.status === "pending_payment" || s.status === "halted");
  const inactive  = subs.filter(s => s.status === "cancelled" || s.status === "created");

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />
      <div className="container mx-auto px-4 max-w-3xl pt-24">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

          {/* Header */}
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-primary" /> Subscriptions
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage billing for all your servers
              </p>
            </div>
            <button onClick={loadSubs} disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs text-muted-foreground hover:text-white transition-colors"
              style={{ border: "1px solid hsl(0 0% 20%)" }}>
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-sm p-4 mb-6 flex items-center gap-2 text-xs"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
              <AlertCircle size={12} /> {error}
              <button onClick={() => setError("")} className="ml-auto"><X size={11} /></button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-3" />
              Loading subscriptions…
            </div>
          ) : subs.length === 0 ? (
            <div className="rounded-sm p-10 text-center" style={{ border: "1px solid hsl(0 0% 16%)" }}>
              <CreditCard className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-sm text-foreground mb-1">No subscriptions yet</p>
              <p className="text-xs text-muted-foreground mb-5">Purchase a plan to get started.</p>
              <Link to="/pricing"
                className="inline-flex items-center gap-2 px-5 py-2 rounded-sm text-sm font-semibold transition-all hover:brightness-110"
                style={{ background: "hsl(350 85% 45%)", color: "white" }}>
                View Plans
              </Link>
            </div>
          ) : (
            <div className="space-y-6">

              {/* Needs attention */}
              {attention.length > 0 && (
                <section>
                  <p className="text-[10px] mono uppercase tracking-widest mb-3 flex items-center gap-1.5"
                    style={{ color: "#fbbf24" }}>
                    <AlertCircle size={10} /> Needs Attention
                  </p>
                  <div className="space-y-3">
                    {attention.map(sub => (
                      <SubCard key={sub.id} sub={sub} token={token} onRefresh={loadSubs} />
                    ))}
                  </div>
                </section>
              )}

              {/* Active */}
              {active.length > 0 && (
                <section>
                  <p className="text-[10px] mono uppercase tracking-widest mb-3" style={{ color: "#334155" }}>
                    Active
                  </p>
                  <div className="space-y-3">
                    {active.map(sub => (
                      <SubCard key={sub.id} sub={sub} token={token} onRefresh={loadSubs} />
                    ))}
                  </div>
                </section>
              )}

              {/* Inactive */}
              {inactive.length > 0 && (
                <section>
                  <p className="text-[10px] mono uppercase tracking-widest mb-3" style={{ color: "#334155" }}>
                    Inactive
                  </p>
                  <div className="space-y-3">
                    {inactive.map(sub => (
                      <SubCard key={sub.id} sub={sub} token={token} onRefresh={loadSubs} />
                    ))}
                  </div>
                </section>
              )}

              {/* Early pay explainer */}
              <div className="rounded-2xl px-5 py-4 mt-2"
                style={{ background: "rgba(96,165,250,0.05)", border: "1px solid rgba(96,165,250,0.12)" }}>
                <p className="text-xs font-semibold mb-1 flex items-center gap-1.5" style={{ color: "#60a5fa" }}>
                  <Zap size={11} /> How Early Payment Works
                </p>
                <p className="text-[11px] leading-relaxed" style={{ color: "#64748b" }}>
                  Paying early extends your subscription by one full billing cycle (30 days) <em>from your current period end date</em>, not from today.
                  So if your server is active until July 7 and you pay early on June 19, it extends to August 7 — you're paying for the July cycle in advance.
                  Your automatic subscription charge for that cycle will still process and extend it further.
                </p>
              </div>
            </div>
          )}

        </motion.div>
      </div>
    </div>
  );
}
