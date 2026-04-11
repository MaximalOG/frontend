import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, RefreshCw, Send, ChevronDown, ChevronUp, MessageSquare, Trash2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import ConfirmDialog from "@/components/ConfirmDialog";

interface FeedbackReply {
  message: string;
  timestamp: string;
}

interface FeedbackEntry {
  id: string;
  ticketId: string | null;
  email: string | null;
  rating: number;
  comment: string;
  replies: FeedbackReply[];
  createdAt: string;
}

const ease = [0.16, 1, 0.3, 1] as const;

const STAR_LABEL = ["", "Poor", "Fair", "Good", "Great", "Excellent"];
const STAR_COLOR = ["", "hsl(350 85% 55%)", "hsl(38 90% 55%)", "hsl(38 90% 55%)", "hsl(142 70% 55%)", "hsl(142 70% 55%)"];

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          size={13}
          style={{
            fill: s <= rating ? "hsl(38 90% 55%)" : "transparent",
            color: s <= rating ? "hsl(38 90% 55%)" : "hsl(0 0% 25%)",
          }}
        />
      ))}
    </div>
  );
}

const AdminFeedback = () => {
  const { isOwner, token } = useAdminAuth();
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replySending, setReplySending] = useState<Record<string, boolean>>({});
  const [replySent, setReplySent] = useState<Record<string, boolean>>({});
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/feedback`);
      if (res.ok) setFeedback(await res.json());
    } catch { setFeedback([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const sendReply = async (fb: FeedbackEntry) => {
    const msg = replyText[fb.id]?.trim();
    if (!msg) return;
    setReplySending(prev => ({ ...prev, [fb.id]: true }));
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/feedback/${fb.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      if (res.ok) {
        setReplySent(prev => ({ ...prev, [fb.id]: true }));
        setReplyText(prev => ({ ...prev, [fb.id]: "" }));
        setTimeout(() => setReplySent(prev => ({ ...prev, [fb.id]: false })), 3000);
        load();
      }
    } finally {
      setReplySending(prev => ({ ...prev, [fb.id]: false }));
    }
  };

  const clearAll = async () => {
    setClearing(true);
    setShowClearConfirm(false);
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/admin/feedback`, {
        method: "DELETE",
        headers: { "x-admin-token": token() },
      });
      await load();
    } finally {
      setClearing(false);
    }
  };

  // Stats
  const avg = feedback.length
    ? (feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(1)
    : "—";
  const dist = [1, 2, 3, 4, 5].map(r => feedback.filter(f => f.rating === r).length);

  return (
    <div className="min-h-screen bg-background pt-16 pb-24">
      <Navbar />
      <ConfirmDialog
        open={showClearConfirm}
        title="Clear all feedback"
        message={`This will permanently delete all ${feedback.length} feedback entries. This cannot be undone.`}
        confirmLabel="Delete All"
        onConfirm={clearAll}
        onCancel={() => setShowClearConfirm(false)}
      />
      <div className="container mx-auto px-4 max-w-4xl pt-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>

          {/* Header */}
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
                <Star className="w-6 h-6 text-yellow-400" />
                Customer Feedback
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Ratings submitted after support tickets</p>
            </div>
          <div className="flex items-center gap-2">
              {isOwner && feedback.length > 0 && (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  disabled={clearing}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs transition-colors disabled:opacity-50"
                  style={{ border: "1px solid hsl(350 85% 30%)", color: clearing ? "hsl(350 85% 40%)" : "hsl(350 85% 60%)" }}
                >
                  <Trash2 size={12} />
                  {clearing ? "Clearing…" : `Clear All (${feedback.length})`}
                </button>
              )}
            <button
              onClick={load}
              className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs text-muted-foreground hover:text-white transition-colors"
              style={{ border: "1px solid hsl(0 0% 20%)" }}
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            <div className="glass-surface rounded-sm p-4 text-center" style={{ border: "1px solid hsl(0 0% 16%)" }}>
              <p className="text-3xl font-bold text-yellow-400">{avg}</p>
              <p className="text-xs text-muted-foreground mt-1">Average Rating</p>
              {feedback.length > 0 && (
                <div className="flex justify-center mt-1.5">
                  <Stars rating={Math.round(Number(avg))} />
                </div>
              )}
            </div>
            <div className="glass-surface rounded-sm p-4 text-center" style={{ border: "1px solid hsl(0 0% 16%)" }}>
              <p className="text-3xl font-bold text-foreground">{feedback.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Responses</p>
            </div>
            <div className="glass-surface rounded-sm p-4 col-span-2 sm:col-span-1" style={{ border: "1px solid hsl(0 0% 16%)" }}>
              <p className="text-[9px] text-muted-foreground/50 mono uppercase tracking-wider mb-2">Distribution</p>
              <div className="space-y-1">
                {[5, 4, 3, 2, 1].map(r => (
                  <div key={r} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-3">{r}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: feedback.length ? `${(dist[r - 1] / feedback.length) * 100}%` : "0%",
                          background: "hsl(38 90% 55%)",
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground/50 w-4 text-right">{dist[r - 1]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Feedback list */}
          {loading ? (
            <div className="text-center py-16 text-muted-foreground text-sm">Loading feedback…</div>
          ) : feedback.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">No feedback yet.</div>
          ) : (
            <div className="space-y-3">
              {feedback.map((fb, i) => (
                <motion.div
                  key={fb.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, ease }}
                  className="glass-surface rounded-sm overflow-hidden"
                  style={{ border: "1px solid hsl(0 0% 16%)" }}
                >
                  {/* Row */}
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer"
                    onClick={() => setExpanded(expanded === fb.id ? null : fb.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Stars rating={fb.rating} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground" style={{ color: STAR_COLOR[fb.rating] }}>
                          {STAR_LABEL[fb.rating]}
                        </p>
                        {fb.email && (
                          <p className="text-[10px] text-muted-foreground/50 truncate">{fb.email}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {fb.ticketId && (
                        <span className="text-[10px] text-muted-foreground/40 mono hidden sm:block">{fb.ticketId}</span>
                      )}
                      {fb.replies?.length > 0 && (
                        <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
                          <MessageSquare size={9} /> {fb.replies.length}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground/40">
                        {new Date(fb.createdAt).toLocaleDateString()}
                      </span>
                      {expanded === fb.id
                        ? <ChevronUp size={14} className="text-muted-foreground" />
                        : <ChevronDown size={14} className="text-muted-foreground" />
                      }
                    </div>
                  </div>

                  {/* Expanded */}
                  {expanded === fb.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="border-t px-4 py-4 space-y-4"
                      style={{ borderColor: "hsl(0 0% 14%)" }}
                    >
                      {/* Comment */}
                      {fb.comment ? (
                        <div>
                          <p className="text-[9px] text-muted-foreground/50 mono uppercase tracking-wider mb-1">Comment</p>
                          <p className="text-xs text-foreground bg-muted/20 rounded-sm px-3 py-2">{fb.comment}</p>
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground/40 italic">No comment provided.</p>
                      )}

                      {/* Reply thread */}
                      {fb.replies?.length > 0 && (
                        <div>
                          <p className="text-[9px] text-muted-foreground/50 mono uppercase tracking-wider mb-2">Follow-up Thread</p>
                          <div className="space-y-2">
                            {fb.replies.map((r, idx) => (
                              <div key={idx} className="rounded-sm px-3 py-2 text-xs ml-4"
                                style={{ background: "hsl(350 85% 10%)", border: "1px solid hsl(350 85% 25%)" }}>
                                <div className="flex justify-between mb-1">
                                  <span className="text-[9px] font-semibold uppercase mono" style={{ color: "hsl(350 85% 60%)" }}>You (Support)</span>
                                  <span className="text-[9px] text-muted-foreground/40">{new Date(r.timestamp).toLocaleString()}</span>
                                </div>
                                <p className="text-foreground/80 whitespace-pre-wrap">{r.message}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Reply box */}
                      <div>
                        <p className="text-[9px] text-muted-foreground/50 mono uppercase tracking-wider mb-1.5">
                          Send Follow-up{fb.email ? ` to ${fb.email}` : ""}
                        </p>
                        <div className="rounded-sm overflow-hidden" style={{ border: "1px solid hsl(0 0% 20%)" }}>
                          <textarea
                            rows={3}
                            value={replyText[fb.id] ?? ""}
                            onChange={e => setReplyText(prev => ({ ...prev, [fb.id]: e.target.value }))}
                            placeholder="Ask a follow-up question or leave a note…"
                            className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground/40 outline-none resize-none px-3 py-2"
                          />
                          <div className="flex items-center justify-between px-3 py-2"
                            style={{ borderTop: "1px solid hsl(0 0% 16%)", background: "hsl(0 0% 7%)" }}>
                            {replySent[fb.id]
                              ? <span className="text-[11px] text-green-400">✓ Reply saved</span>
                              : <span className="text-[10px] text-muted-foreground/40">Email will be sent to {fb.email || "user"}</span>
                            }
                            <button
                              onClick={() => sendReply(fb)}
                              disabled={!replyText[fb.id]?.trim() || replySending[fb.id]}
                              className="flex items-center gap-1.5 px-3 py-1 rounded-sm text-[11px] font-medium transition-all hover:brightness-110 disabled:opacity-40"
                              style={{ background: "hsl(350 85% 45%)", color: "white" }}
                            >
                              <Send size={11} />
                              {replySending[fb.id] ? "Saving…" : "Save Reply"}
                            </button>
                          </div>
                        </div>
                      </div>

                      <p className="text-[10px] text-muted-foreground/40">
                        Submitted {new Date(fb.createdAt).toLocaleString()}
                        {fb.ticketId && ` · Ticket ${fb.ticketId}`}
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AdminFeedback;
