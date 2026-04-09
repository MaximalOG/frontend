import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Ticket, RefreshCw, CheckCircle, Circle, Clock, Mail, ChevronDown, ChevronUp, Send, AlertCircle } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";

interface Reply {
  from: "support" | "customer";
  message: string;
  timestamp: string;
}

interface TicketData {
  id: string;
  email: string;
  issue: string;
  chat_history: string;
  status: "open" | "pending" | "closed";
  replies: Reply[];
  created_at: string;
}

const ease = [0.16, 1, 0.3, 1] as const;

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  open:    { bg: "hsl(350 85% 15%)", color: "hsl(350 85% 65%)", border: "hsl(350 85% 30%)" },
  pending: { bg: "hsl(38 90% 12%)",  color: "hsl(38 90% 60%)",  border: "hsl(38 90% 28%)" },
  closed:  { bg: "hsl(142 60% 10%)", color: "hsl(142 70% 55%)", border: "hsl(142 60% 25%)" },
};

const AdminTickets = () => {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "pending" | "closed">("all");
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replySending, setReplySending] = useState<Record<string, boolean>>({});
  const [replySent, setReplySent] = useState<Record<string, boolean>>({});
  const [polling, setPolling] = useState(false);
  const [clearingClosed, setClearingClosed] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/tickets`);
      const data = await res.json();
      setTickets(data.reverse());
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  const toggleStatus = async (ticket: TicketData) => {
    const next = ticket.status !== "closed" ? "closed" : "open";
    await fetch(`${import.meta.env.VITE_API_URL}/api/admin/tickets/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    load();
  };

  const sendReply = async (ticket: TicketData) => {
    const msg = replyText[ticket.id]?.trim();
    if (!msg) return;
    setReplySending(prev => ({ ...prev, [ticket.id]: true }));
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/tickets/${ticket.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      if (res.ok) {
        setReplySent(prev => ({ ...prev, [ticket.id]: true }));
        setReplyText(prev => ({ ...prev, [ticket.id]: "" }));
        setTimeout(() => setReplySent(prev => ({ ...prev, [ticket.id]: false })), 3000);
        load();
      }
    } finally {
      setReplySending(prev => ({ ...prev, [ticket.id]: false }));
    }
  };

  const pollInbox = async () => {
    setPolling(true);
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/admin/poll-inbox`, { method: "POST" });
      await load();
    } finally {
      setPolling(false);
    }
  };

  const clearClosed = async () => {
    setClearingClosed(true);
    setShowClearConfirm(false);
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/admin/tickets/closed`, { method: "DELETE" });
      await load();
    } finally {
      setClearingClosed(false);
    }
  };

  const filtered = tickets.filter(t => filter === "all" || t.status === filter);
  const openCount    = tickets.filter(t => t.status === "open").length;
  const pendingCount = tickets.filter(t => t.status === "pending").length;
  const closedCount  = tickets.filter(t => t.status === "closed").length;

  return (
    <div className="min-h-screen bg-background pt-16 pb-24">
      <ConfirmDialog
        open={showClearConfirm}
        title="Clear closed tickets"
        message={`This will permanently delete all ${tickets.filter(t => t.status === "closed").length} closed tickets. This cannot be undone.`}
        confirmLabel="Delete All"
        onConfirm={clearClosed}
        onCancel={() => setShowClearConfirm(false)}
      />
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="pt-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
                <Ticket className="w-6 h-6 text-primary" />
                Support Tickets
              </h1>
              <p className="text-sm text-muted-foreground mt-1">NetherNodes Admin Panel</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={pollInbox}
                disabled={polling}
                className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs transition-colors"
                style={{ border: "1px solid hsl(270 70% 30%)", color: polling ? "hsl(270 70% 40%)" : "hsl(270 70% 60%)" }}
              >
                <Mail size={12} className={polling ? "animate-pulse" : ""} />
                {polling ? "Checking…" : "Check Inbox"}
              </button>
              <button
                onClick={load}
                className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs text-muted-foreground hover:text-white transition-colors"
                style={{ border: "1px solid hsl(0 0% 20%)" }}
              >
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
              {tickets.filter(t => t.status === "closed").length > 0 && (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  disabled={clearingClosed}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs transition-colors disabled:opacity-50"
                  style={{ border: "1px solid hsl(350 85% 30%)", color: clearingClosed ? "hsl(350 85% 40%)" : "hsl(350 85% 60%)" }}
                >
                  <RefreshCw size={12} className={clearingClosed ? "animate-spin" : ""} />
                  {clearingClosed ? "Clearing…" : `Clear Closed (${tickets.filter(t => t.status === "closed").length})`}
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total",   value: tickets.length, color: "text-foreground" },
              { label: "Open",    value: openCount,       color: "text-primary" },
              { label: "Pending", value: pendingCount,    color: "text-yellow-400" },
              { label: "Closed",  value: closedCount,     color: "text-green-400" },
            ].map(s => (
              <div key={s.label} className="glass-surface rounded-sm p-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {(["all", "open", "pending", "closed"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1 rounded-sm text-xs font-medium capitalize transition-all"
                style={{
                  background: filter === f ? "hsl(350 85% 45%)" : "hsl(0 0% 10%)",
                  color: filter === f ? "white" : "hsl(0 0% 55%)",
                  border: `1px solid ${filter === f ? "hsl(350 85% 55%)" : "hsl(0 0% 20%)"}`,
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Ticket list */}
          {loading ? (
            <div className="text-center py-16 text-muted-foreground text-sm">Loading tickets...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">No tickets found.</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((ticket, i) => {
                const ss = STATUS_STYLE[ticket.status] ?? STATUS_STYLE.open;
                return (
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3, ease }}
                    className="glass-surface rounded-sm overflow-hidden"
                    style={{ border: `1px solid ${ss.border}` }}
                  >
                    {/* Header row */}
                    <div
                      className="flex items-center justify-between px-4 py-3 cursor-pointer"
                      onClick={() => setExpanded(expanded === ticket.id ? null : ticket.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {ticket.status === "closed"
                          ? <CheckCircle size={14} className="text-green-400 shrink-0" />
                          : ticket.status === "pending"
                          ? <AlertCircle size={14} className="text-yellow-400 shrink-0" />
                          : <Circle size={14} className="text-primary shrink-0" />
                        }
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground mono">{ticket.id}</p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Mail size={9} />{ticket.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {(ticket.replies?.length ?? 0) > 0 && (
                          <span className="text-[10px] text-muted-foreground/60 hidden sm:block">
                            {ticket.replies.length} repl{ticket.replies.length === 1 ? "y" : "ies"}
                          </span>
                        )}
                        <div className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock size={9} />
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </div>
                        <span
                          className="px-2 py-0.5 rounded-sm text-[9px] font-semibold uppercase mono"
                          style={{ background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}
                        >
                          {ticket.status}
                        </span>
                        {expanded === ticket.id
                          ? <ChevronUp size={14} className="text-muted-foreground" />
                          : <ChevronDown size={14} className="text-muted-foreground" />
                        }
                      </div>
                    </div>

                    {/* Expanded */}
                    {expanded === ticket.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="border-t px-4 py-4 space-y-4"
                        style={{ borderColor: "hsl(0 0% 14%)" }}
                      >
                        {/* Issue summary */}
                        <div>
                          <p className="text-[9px] text-muted-foreground/50 mono uppercase tracking-wider mb-1">Issue Summary</p>
                          {ticket.issue.includes("Issue Type:") ? (
                            <div className="space-y-1.5 bg-muted/30 rounded-sm px-3 py-2">
                              {ticket.issue.split("\n").map((line, idx) => {
                                const ci = line.indexOf(":");
                                if (ci === -1) return null;
                                return (
                                  <div key={idx} className="flex gap-2 text-xs">
                                    <span className="text-muted-foreground/60 shrink-0 w-28">{line.slice(0, ci)}:</span>
                                    <span className="text-foreground">{line.slice(ci + 1).trim()}</span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-foreground bg-muted/30 rounded-sm px-3 py-2">{ticket.issue}</p>
                          )}
                        </div>

                        {/* Original chat */}
                        {ticket.chat_history && (
                          <div>
                            <p className="text-[9px] text-muted-foreground/50 mono uppercase tracking-wider mb-1">Original Conversation</p>
                            <pre className="text-[10px] text-muted-foreground bg-muted/20 rounded-sm px-3 py-2 whitespace-pre-wrap max-h-36 overflow-y-auto">
                              {ticket.chat_history}
                            </pre>
                          </div>
                        )}

                        {/* Reply thread */}
                        {(ticket.replies?.length ?? 0) > 0 && (
                          <div>
                            <p className="text-[9px] text-muted-foreground/50 mono uppercase tracking-wider mb-2">Reply Thread</p>
                            <div className="space-y-2">
                              {ticket.replies.map((r, idx) => (
                                <div
                                  key={idx}
                                  className={`rounded-sm px-3 py-2 text-xs ${r.from === "support" ? "ml-4" : "mr-4"}`}
                                  style={{
                                    background: r.from === "support" ? "hsl(350 85% 10%)" : "hsl(0 0% 10%)",
                                    border: `1px solid ${r.from === "support" ? "hsl(350 85% 25%)" : "hsl(0 0% 20%)"}`,
                                  }}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[9px] font-semibold uppercase mono"
                                      style={{ color: r.from === "support" ? "hsl(350 85% 60%)" : "hsl(0 0% 60%)" }}>
                                      {r.from === "support" ? "You (Support)" : ticket.email}
                                    </span>
                                    <span className="text-[9px] text-muted-foreground/40">
                                      {new Date(r.timestamp).toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="text-foreground/80 whitespace-pre-wrap leading-relaxed">{r.message}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Reply box */}
                        <div>
                          <p className="text-[9px] text-muted-foreground/50 mono uppercase tracking-wider mb-1.5">
                            Reply to {ticket.email}
                          </p>
                          <div className="rounded-sm overflow-hidden" style={{ border: "1px solid hsl(0 0% 20%)" }}>
                            <textarea
                              rows={3}
                              value={replyText[ticket.id] ?? ""}
                              onChange={e => setReplyText(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                              placeholder="Type your reply…"
                              className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground/40 outline-none resize-none px-3 py-2"
                            />
                            <div className="flex items-center justify-between px-3 py-2"
                              style={{ borderTop: "1px solid hsl(0 0% 16%)", background: "hsl(0 0% 7%)" }}>
                              {replySent[ticket.id]
                                ? <span className="text-[11px] text-green-400">✓ Sent — ticket set to Pending</span>
                                : <span className="text-[10px] text-muted-foreground/40">Ticket moves to Pending after sending</span>
                              }
                              <button
                                onClick={() => sendReply(ticket)}
                                disabled={!replyText[ticket.id]?.trim() || replySending[ticket.id]}
                                className="flex items-center gap-1.5 px-3 py-1 rounded-sm text-[11px] font-medium transition-all hover:brightness-110 disabled:opacity-40"
                                style={{ background: "hsl(350 85% 45%)", color: "white" }}
                              >
                                <Send size={11} />
                                {replySending[ticket.id] ? "Sending…" : "Send Reply"}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-1">
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(ticket.created_at).toLocaleString()}
                          </p>
                          <button
                            onClick={() => toggleStatus(ticket)}
                            className="px-3 py-1 rounded-sm text-[11px] font-medium transition-all hover:brightness-110"
                            style={{
                              background: ticket.status !== "closed" ? "hsl(142 60% 15%)" : "hsl(350 85% 15%)",
                              color: ticket.status !== "closed" ? "hsl(142 70% 55%)" : "hsl(350 85% 65%)",
                              border: `1px solid ${ticket.status !== "closed" ? "hsl(142 60% 25%)" : "hsl(350 85% 30%)"}`,
                            }}
                          >
                            Mark as {ticket.status !== "closed" ? "Closed" : "Open"}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AdminTickets;
