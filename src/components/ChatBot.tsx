import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, ExternalLink, Ticket, Paperclip, FileText, Star } from "lucide-react";
import { Link } from "react-router-dom";

interface Message {
  role: "user" | "ai";
  text: string;
  showButtons?: boolean;
  recommendedPlan?: string | null;
  ramRequired?: string | null;
  isTicket?: boolean;
  imageUrl?: string;
  fileName?: string;
}

interface HistoryEntry {
  role: "user" | "assistant";
  content: string;
}

interface FlowState {
  step?: string;
  players?: number;
  serverType?: string;
  plugins?: number;
  activity?: string;
  version?: string;
  awaitingEscalation?: boolean;
}

interface Attachment {
  type: "image" | "text";
  name: string;
  data: string;
  mimeType: string;
  previewUrl?: string;
}

type EscalationStep = "none" | "ask_email" | "ask_issue" | "creating" | "done";
// feedback: "idle" = showing stars, "submitted" = thank you shown
type FeedbackStep = "idle" | "submitted";

const MAX_LENGTH = 500;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_TEXT_TYPES = ["text/plain", "application/json", "text/yaml", "text/x-yaml"];
const ALLOWED_EXTENSIONS = [".txt", ".log", ".yml", ".yaml", ".json", ".properties", ".cfg", ".conf", ".toml"];

async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

const ChatBot = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", text: "Hey! I'm NetherNodes AI. Need help picking a plan or setting up your server?" },
  ]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [flowState, setFlowState] = useState<FlowState | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Escalation
  const [escalation, setEscalation] = useState<EscalationStep>("none");
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingIssue, setPendingIssue] = useState("");

  // Feedback (shown after ticket created)
  const [feedbackStep, setFeedbackStep] = useState<FeedbackStep>("idle");
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackHover, setFeedbackHover] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, escalation]);

  useEffect(() => {
    if (!loading && escalation !== "creating" && escalation !== "done") {
      inputRef.current?.focus();
    }
  }, [loading, messages, escalation]);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-chatbot", handler);
    return () => window.removeEventListener("open-chatbot", handler);
  }, []);

  const addAI = (text: string, extra?: Partial<Message>) => {
    setMessages(prev => [...prev, { role: "ai", text, ...extra }]);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    (e.target as HTMLInputElement).value = "";
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) { addAI("File too large. Max size is 5MB."); return; }
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isText = ALLOWED_TEXT_TYPES.includes(file.type) ||
      ALLOWED_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext));
    if (!isImage && !isText) {
      addAI("Unsupported file type. You can share images (JPG, PNG, GIF, WebP) or text files (txt, log, yml, json, properties, cfg).");
      return;
    }
    if (isImage) {
      const base64 = await readFileAsBase64(file);
      const previewUrl = URL.createObjectURL(file);
      setAttachment({ type: "image", name: file.name, data: base64, mimeType: file.type, previewUrl });
    } else {
      const text = await readFileAsText(file);
      if (text.length > 8000) { addAI("File is too long. Please share the relevant section."); return; }
      setAttachment({ type: "text", name: file.name, data: text, mimeType: file.type });
    }
  };

  const clearAttachment = () => {
    if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    setAttachment(null);
  };

  const buildHistory = () =>
    messages
      .filter(m => m.text && m.text !== "ESCALATE_CONFIRMED" && !m.text.startsWith("Creating your ticket"))
      .map(m => `${m.role === "user" ? "User" : "AI"}: ${m.text}`)
      .join("\n");

  const handleEscalationInput = async (text: string) => {
    setMessages(prev => [...prev, { role: "user", text }]);
    setInput("");
    if (escalation === "ask_email") {
      const email = text.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        addAI("That doesn't look like a valid email. Please enter a valid email address.");
        return;
      }
      setPendingEmail(email);
      if (pendingIssue) { await submitTicket(email, pendingIssue); }
      else { setEscalation("ask_issue"); addAI("Got it. Can you briefly describe your issue so I can pass it to the team?"); }
      return;
    }
    if (escalation === "ask_issue") {
      setPendingIssue(text.trim());
      await submitTicket(pendingEmail, text.trim());
    }
  };

  const submitTicket = async (email: string, issue: string) => {
    setEscalation("creating");
    setLoading(true);
    addAI("Creating your ticket and notifying our team...");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/create-ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, issue, chat_history: buildHistory() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setEscalation("done");
      addAI(
        `✅ Ticket created (ID: ${data.ticket_id}).\n\nOur team will contact you at ${email} soon.`,
        { isTicket: true }
      );
    } catch (err: any) {
      setEscalation("ask_email");
      const msg = err?.message || "";
      if (msg.toLowerCase().includes("disposable") || msg.toLowerCase().includes("real email") || msg.toLowerCase().includes("doesn't appear")) {
        addAI(msg);
      } else {
        addAI("Something went wrong. Please try a different email or contact us at supportnethernodes@gmail.com");
      }
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async () => {
    if (feedbackRating === 0) return;
    setFeedbackSubmitting(true);
    // Fire-and-forget — no backend endpoint needed, just UX
    await new Promise(r => setTimeout(r, 600));
    setFeedbackStep("submitted");
    setFeedbackSubmitting(false);
  };

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if ((!text && !attachment) || loading) return;
    if (escalation === "ask_email" || escalation === "ask_issue") {
      await handleEscalationInput(text);
      return;
    }
    setInput("");
    const currentAttachment = attachment;
    setAttachment(null);
    setMessages(prev => [...prev, {
      role: "user",
      text: text || (currentAttachment ? `[Shared ${currentAttachment.type === "image" ? "an image" : `file: ${currentAttachment.name}`}]` : ""),
      imageUrl: currentAttachment?.type === "image" ? currentAttachment.previewUrl : undefined,
      fileName: currentAttachment?.type === "text" ? currentAttachment.name : undefined,
    }]);
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text || "I shared a file, please analyze it.",
          history, flowState,
          attachment: currentAttachment ? {
            type: currentAttachment.type, name: currentAttachment.name,
            data: currentAttachment.data, mimeType: currentAttachment.mimeType,
          } : null,
        }),
      });
      const data = await res.json();
      if (data.error) { addAI(data.error); return; }
      setFlowState(data.flowState ?? null);
      if (!data.flowState) {
        setHistory(prev => [...prev,
          { role: "user", content: text },
          { role: "assistant", content: data.message },
        ]);
      }
      if (data.message?.trim() === "ESCALATE_CONFIRMED") {
        setEscalation("ask_email");
        const recentIssue = history.filter(h => h.role === "user").map(h => h.content).join(" ").slice(0, 400) || text;
        setPendingIssue(recentIssue);
        setTimeout(() => addAI("I'll need your email address so our support team can contact you."), 300);
        return;
      }
      const delay = data.showButtons ? 600 : 0;
      setTimeout(() => addAI(data.message, {
        showButtons: data.showButtons,
        recommendedPlan: data.recommendedPlan,
        ramRequired: data.ramRequired ?? null,
      }), delay);
    } catch {
      addAI("Server is busy, please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const getPlaceholder = () => {
    if (escalation === "ask_email") return "Enter your email address…";
    if (escalation === "ask_issue") return "Briefly describe your issue…";
    return "Ask about your server…";
  };

  const isDone = escalation === "done";

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="w-[340px] flex flex-col rounded-sm overflow-hidden"
            style={{
              height: isDone ? "auto" : 500,
              maxHeight: 560,
              background: "hsl(0 0% 6%)",
              border: "1px solid hsl(350, 85%, 40%)",
              boxShadow: "0 0 30px hsl(350 85% 30% / 0.4), 0 8px 32px rgba(0,0,0,0.6)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b shrink-0"
              style={{ borderColor: "hsl(350 85% 30% / 0.4)", background: "hsl(0 0% 8%)" }}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <div>
                  <p className="text-sm font-bold text-white leading-none">NetherNodes AI</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {isDone ? "Ticket submitted" : escalation !== "none" ? "Support escalation in progress" : "Instant help for your server"}
                  </p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-white transition-colors" aria-label="Close chat">
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ minHeight: 0 }}>
              {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="max-w-[82%] px-3 py-2 rounded-sm text-xs leading-relaxed whitespace-pre-line"
                    style={
                      msg.role === "user"
                        ? { background: "hsl(350 85% 45%)", color: "white" }
                        : msg.isTicket
                        ? { background: "hsl(142 60% 10%)", color: "hsl(142 70% 70%)", border: "1px solid hsl(142 60% 25%)" }
                        : { background: "hsl(0 0% 12%)", color: "hsl(0 0% 85%)", border: "1px solid hsl(0 0% 18%)" }
                    }
                  >
                    {msg.isTicket && <Ticket size={12} className="inline mr-1 mb-0.5" />}
                    {msg.imageUrl && <img src={msg.imageUrl} alt="attachment" className="w-full rounded-sm mb-2 max-h-40 object-contain" />}
                    {msg.fileName && (
                      <div className="flex items-center gap-1.5 mb-1 opacity-70">
                        <FileText size={11} />
                        <span className="text-[10px]">{msg.fileName}</span>
                      </div>
                    )}
                    {msg.text}
                  </motion.div>
                  {msg.showButtons && msg.recommendedPlan && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.2 }} className="flex gap-2 mt-2">
                      <Link
                        to="/pricing"
                        onClick={() => sessionStorage.setItem("nn_recommended_plan", msg.recommendedPlan!)}
                        className="px-3 py-1.5 rounded-sm text-[11px] font-medium text-white transition-all hover:brightness-110"
                        style={{ background: "hsl(350 85% 45%)", border: "1px solid hsl(350 85% 55%)", boxShadow: "0 0 10px hsl(350 85% 40% / 0.4)" }}
                      >
                        Start {msg.recommendedPlan}{msg.ramRequired ? ` (${msg.ramRequired})` : ""}
                      </Link>
                      <Link
                        to="/pricing"
                        onClick={() => sessionStorage.setItem("nn_recommended_plan", msg.recommendedPlan!)}
                        className="px-3 py-1.5 rounded-sm text-[11px] font-medium text-muted-foreground hover:text-white transition-colors flex items-center gap-1"
                        style={{ background: "hsl(0 0% 14%)", border: "1px solid hsl(0 0% 20%)" }}
                      >
                        View Plans <ExternalLink size={10} />
                      </Link>
                    </motion.div>
                  )}
                </div>
              ))}
              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="px-3 py-2 rounded-sm text-xs flex items-center gap-1" style={{ background: "hsl(0 0% 12%)", border: "1px solid hsl(0 0% 18%)" }}>
                    {[0, 0.15, 0.3].map((delay, i) => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: `${delay}s` }} />
                    ))}
                  </div>
                </motion.div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* ── FEEDBACK PANEL — shown after ticket created ── */}
            {isDone && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="shrink-0 px-4 py-4 border-t space-y-3"
                style={{ borderColor: "hsl(0 0% 14%)", background: "hsl(0 0% 7%)" }}
              >
                {feedbackStep === "submitted" ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-2"
                  >
                    <p className="text-sm font-semibold text-white mb-0.5">Thanks for your feedback!</p>
                    <p className="text-[10px] text-muted-foreground">We'll use it to improve our support.</p>
                  </motion.div>
                ) : (
                  <>
                    <div>
                      <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mono mb-2">
                        How was your support experience?
                      </p>
                      {/* Stars */}
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            onClick={() => setFeedbackRating(star)}
                            onMouseEnter={() => setFeedbackHover(star)}
                            onMouseLeave={() => setFeedbackHover(0)}
                            className="transition-transform hover:scale-110"
                            aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                          >
                            <Star
                              size={22}
                              className="transition-colors"
                              style={{
                                fill: star <= (feedbackHover || feedbackRating)
                                  ? "hsl(38 90% 55%)"
                                  : "transparent",
                                color: star <= (feedbackHover || feedbackRating)
                                  ? "hsl(38 90% 55%)"
                                  : "hsl(0 0% 30%)",
                              }}
                            />
                          </button>
                        ))}
                        {feedbackRating > 0 && (
                          <span className="text-[10px] text-muted-foreground/50 self-center ml-1">
                            {["", "Poor", "Fair", "Good", "Great", "Excellent"][feedbackRating]}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Comment textarea — separate from chat input */}
                    <textarea
                      value={feedbackComment}
                      onChange={e => setFeedbackComment(e.target.value)}
                      placeholder="Additional comments (optional)…"
                      rows={2}
                      className="w-full rounded-sm px-3 py-2 text-xs text-white placeholder:text-muted-foreground/40 bg-transparent outline-none resize-none"
                      style={{ border: "1px solid hsl(0 0% 20%)" }}
                      onFocus={e => (e.currentTarget.style.borderColor = "hsl(350 85% 40%)")}
                      onBlur={e => (e.currentTarget.style.borderColor = "hsl(0 0% 20%)")}
                    />

                    <button
                      onClick={submitFeedback}
                      disabled={feedbackRating === 0 || feedbackSubmitting}
                      className="w-full h-8 rounded-sm text-xs font-semibold transition-all hover:brightness-110 disabled:opacity-40"
                      style={{ background: "hsl(350 85% 45%)", color: "white" }}
                    >
                      {feedbackSubmitting ? "Submitting…" : "Submit Feedback"}
                    </button>
                  </>
                )}
              </motion.div>
            )}

            {/* ── NORMAL INPUT BAR — hidden after ticket created ── */}
            {!isDone && (
              <>
                {/* Attachment preview */}
                {attachment && (
                  <div className="px-3 pt-2 pb-0 flex items-center gap-2 shrink-0" style={{ borderTop: "1px solid hsl(0 0% 14%)", background: "hsl(0 0% 8%)" }}>
                    {attachment.type === "image" && attachment.previewUrl ? (
                      <img src={attachment.previewUrl} alt="attachment" className="w-10 h-10 rounded-sm object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-sm flex items-center justify-center" style={{ background: "hsl(0 0% 14%)" }}>
                        <FileText size={16} className="text-muted-foreground" />
                      </div>
                    )}
                    <span className="text-[10px] text-muted-foreground flex-1 truncate">{attachment.name}</span>
                    <button onClick={clearAttachment} className="text-muted-foreground/50 hover:text-white transition-colors"><X size={12} /></button>
                  </div>
                )}

                {/* Input row */}
                <div
                  className="px-3 py-3 border-t flex gap-2 items-center shrink-0"
                  style={{
                    borderColor: escalation !== "none" ? "hsl(142 60% 25% / 0.6)" : "hsl(350 85% 30% / 0.4)",
                    background: "hsl(0 0% 8%)",
                  }}
                >
                  <input ref={fileInputRef} type="file" accept="image/*,.txt,.log,.yml,.yaml,.json,.properties,.cfg,.conf,.toml" onChange={handleFileSelect} className="hidden" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading || escalation === "creating"}
                    className="text-muted-foreground/50 hover:text-muted-foreground transition-colors disabled:opacity-30 shrink-0"
                    aria-label="Attach file"
                  >
                    <Paperclip size={14} />
                  </button>
                  <input
                    ref={inputRef}
                    type={escalation === "ask_email" ? "email" : "text"}
                    value={input}
                    onChange={e => setInput(e.target.value.slice(0, MAX_LENGTH))}
                    onKeyDown={handleKey}
                    placeholder={getPlaceholder()}
                    disabled={loading || escalation === "creating"}
                    className="flex-1 bg-transparent text-xs text-white placeholder:text-muted-foreground outline-none"
                    aria-label="Chat input"
                  />
                  {escalation === "none" && (
                    <span className="text-[10px] text-muted-foreground/40 shrink-0">{input.length}/{MAX_LENGTH}</span>
                  )}
                  <button
                    onClick={() => send()}
                    disabled={loading || (!input.trim() && !attachment) || escalation === "creating"}
                    className="text-primary hover:brightness-125 disabled:opacity-40 transition-all"
                    aria-label="Send message"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Orb button */}
      <div className="relative flex items-center justify-center" style={{ width: 56, height: 56 }}>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, rotate: 360 }}
            exit={{ opacity: 0 }}
            transition={{ rotate: { duration: 3, repeat: Infinity, ease: "linear" }, opacity: { duration: 0.2 } }}
            style={{
              position: "absolute", inset: -5, borderRadius: "50%",
              border: "2px solid transparent",
              borderTopColor: "hsl(350 85% 60%)",
              borderRightColor: "hsl(270 70% 60%)",
              pointerEvents: "none",
            }}
          />
        )}
        {!open && (
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.45, 0, 0.45] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "hsl(350 85% 50% / 0.25)", pointerEvents: "none" }}
          />
        )}
        <motion.button
          onClick={() => setOpen(v => !v)}
          whileHover={{ scale: 1.1, boxShadow: "0 0 36px hsl(350 85% 55% / 0.9), 0 0 64px hsl(350 85% 40% / 0.45)" }}
          whileTap={{ scale: 0.92 }}
          animate={!open ? { y: [0, -4, 0] } : { y: 0 }}
          transition={!open ? { y: { duration: 3, repeat: Infinity, ease: "easeInOut" } } : {}}
          aria-label="Toggle AI chat"
          style={{
            width: 52, height: 52, borderRadius: "50%", position: "relative",
            cursor: "pointer", border: "none", padding: 0,
            background: open
              ? "radial-gradient(circle at 35% 35%, hsl(0 0% 18%), hsl(0 0% 8%))"
              : "radial-gradient(circle at 35% 35%, hsl(350 85% 62%), hsl(350 85% 36%))",
            boxShadow: open
              ? "0 0 20px hsl(350 85% 40% / 0.5), inset 0 1px 0 rgba(255,255,255,0.12)"
              : "0 0 24px hsl(350 85% 50% / 0.7), 0 0 48px hsl(350 85% 40% / 0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
        >
          <div style={{ position: "absolute", top: "18%", left: "20%", width: "28%", height: "28%", borderRadius: "50%", background: "rgba(255,255,255,0.32)", filter: "blur(2px)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <AnimatePresence mode="wait">
              {open
                ? <motion.div key="x" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }} transition={{ duration: 0.18 }}><X size={18} color="white" /></motion.div>
                : <motion.div key="msg" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} transition={{ duration: 0.18 }}><MessageSquare size={18} color="white" /></motion.div>
              }
            </AnimatePresence>
          </div>
        </motion.button>
      </div>
    </div>
  );
};

export default ChatBot;
