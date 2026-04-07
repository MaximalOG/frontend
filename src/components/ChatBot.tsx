import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, ExternalLink, Ticket, Paperclip, FileText, Image as ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";

interface Message {
  role: "user" | "ai";
  text: string;
  showButtons?: boolean;
  recommendedPlan?: string | null;
  ramRequired?: string | null;
  isTicket?: boolean;
  imageUrl?: string;      // preview for images
  fileName?: string;      // name for file attachments
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
  data: string;       // base64 for images, raw text for text files
  mimeType: string;
  previewUrl?: string; // object URL for image preview
}

type EscalationStep = "none" | "ask_email" | "ask_issue" | "creating" | "done";

const MAX_LENGTH = 500;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_TEXT_TYPES = ["text/plain", "application/json", "text/yaml", "text/x-yaml"];
const ALLOWED_EXTENSIONS = [".txt", ".log", ".yml", ".yaml", ".json", ".properties", ".cfg", ".conf", ".toml"];

async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]); // strip data:...;base64,
    };
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

  // Escalation state
  const [escalation, setEscalation] = useState<EscalationStep>("none");
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingIssue, setPendingIssue] = useState("");
  const [resetCountdown, setResetCountdown] = useState<number | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Refocus input after every message
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

  // Reset chat after ticket created
  useEffect(() => {
    if (escalation !== "done") return;
    let count = 10;
    setResetCountdown(count);
    const interval = setInterval(() => {
      count--;
      setResetCountdown(count);
      if (count <= 0) {
        clearInterval(interval);
        setMessages([{ role: "ai", text: "Hey! I'm NetherNodes AI. Need help picking a plan or setting up your server?" }]);
        setHistory([]);
        setFlowState(null);
        setEscalation("none");
        setPendingEmail("");
        setPendingIssue("");
        setResetCountdown(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [escalation]);

  const addAI = (text: string, extra?: Partial<Message>) => {
    setMessages(prev => [...prev, { role: "ai", text, ...extra }]);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!e.target) return;
    (e.target as HTMLInputElement).value = ""; // reset so same file can be re-selected
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      addAI("File too large. Max size is 5MB.");
      return;
    }

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
      if (text.length > 8000) {
        addAI("File is too long. Please share the relevant section (e.g. last 50 lines of a log).");
        return;
      }
      setAttachment({ type: "text", name: file.name, data: text, mimeType: file.type });
    }
  };

  const clearAttachment = () => {
    if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    setAttachment(null);
  };

  // Build readable chat history — uses full message log, filters out system noise
  const buildHistory = () =>
    messages
      .filter(m => m.text && m.text !== "ESCALATE_CONFIRMED" && !m.text.startsWith("Creating your ticket"))
      .map(m => `${m.role === "user" ? "User" : "AI"}: ${m.text}`)
      .join("\n");

  // Handle escalation sub-flow inputs
  const handleEscalationInput = async (text: string) => {
    setMessages(prev => [...prev, { role: "user", text }]);
    setInput("");

    if (escalation === "ask_email") {
      const email = text.trim();
      // Basic format check before hitting server
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        addAI("That doesn't look like a valid email. Please enter a valid email address.");
        return;
      }
      setPendingEmail(email);
      if (pendingIssue) {
        await submitTicket(email, pendingIssue);
      } else {
        setEscalation("ask_issue");
        addAI("Got it. Can you briefly describe your issue so I can pass it to the team?");
      }
      return;
    }

    if (escalation === "ask_issue") {
      const issue = text.trim();
      setPendingIssue(issue);
      await submitTicket(pendingEmail, issue);
      return;
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
        `✅ Your support ticket has been created (Ticket ID: ${data.ticket_id}).\n\nOur team will contact you at ${email} soon. You'll also receive a confirmation email.`,
        { isTicket: true }
      );
    } catch (err: any) {
      // Keep escalation in ask_email so user can retry with a different email
      setEscalation("ask_email");
      const msg = err?.message || "";
      if (msg.toLowerCase().includes("disposable") || msg.toLowerCase().includes("real email") || msg.toLowerCase().includes("doesn't appear")) {
        addAI(msg);
      } else if (msg.toLowerCase().includes("doesn't look real") || msg.toLowerCase().includes("valid email")) {
        addAI(msg + " Please enter your actual email address.");
      } else {
        addAI("Something went wrong creating your ticket. Please try a different email address or contact us at supportnethernodes@gmail.com");
      }
    } finally {
      setLoading(false);
    }
  };

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text && !attachment || loading) return;

    // Handle escalation sub-flow
    if (escalation === "ask_email" || escalation === "ask_issue") {
      await handleEscalationInput(text);
      return;
    }

    setInput("");
    const currentAttachment = attachment;
    setAttachment(null);

    // Add user message with optional attachment preview
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
          history,
          flowState,
          attachment: currentAttachment ? {
            type: currentAttachment.type,
            name: currentAttachment.name,
            data: currentAttachment.data,
            mimeType: currentAttachment.mimeType,
          } : null,
        }),
      });
      const data = await res.json();

      if (data.error) {
        addAI(data.error);
        return;
      }

      setFlowState(data.flowState ?? null);

      if (!data.flowState) {
        setHistory(prev => [
          ...prev,
          { role: "user", content: text },
          { role: "assistant", content: data.message },
        ]);
      }

      // Check if AI confirmed escalation
      if (data.message?.trim() === "ESCALATE_CONFIRMED") {
        setEscalation("ask_email");
        // Build issue from the actual conversation history (before escalation)
        const recentIssue = history
          .filter(h => h.role === "user")
          .map(h => h.content)
          .join(" ")
          .slice(0, 400) || text;
        setPendingIssue(recentIssue);
        setTimeout(() => {
          addAI("I'll need your email address so our support team can contact you.");
        }, 300);
        return;
      }

      const delay = data.showButtons ? 600 : 0;
      setTimeout(() => {
        addAI(data.message, {
          showButtons: data.showButtons,
          recommendedPlan: data.recommendedPlan,
          ramRequired: data.ramRequired ?? null,
        });
      }, delay);

    } catch {
      addAI("Server is busy, please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const getPlaceholder = () => {
    if (escalation === "ask_email") return "Enter your email address…";
    if (escalation === "ask_issue") return "Briefly describe your issue…";
    return "Ask about your server…";
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="w-[340px] h-[500px] flex flex-col rounded-sm overflow-hidden"
            style={{
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
                    {escalation !== "none" ? "Support escalation in progress" : "Instant help for your server"}
                  </p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-white transition-colors" aria-label="Close chat">
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
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
                    {msg.imageUrl && (
                      <img src={msg.imageUrl} alt="attachment" className="w-full rounded-sm mb-2 max-h-40 object-contain" />
                    )}
                    {msg.fileName && (
                      <div className="flex items-center gap-1.5 mb-1 opacity-70">
                        <FileText size={11} />
                        <span className="text-[10px]">{msg.fileName}</span>
                      </div>
                    )}
                    {msg.text}
                  </motion.div>

                  {msg.showButtons && msg.recommendedPlan && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15, duration: 0.2 }}
                      className="flex gap-2 mt-2"
                    >
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

            {/* Attachment preview */}
            {attachment && (
              <div
                className="px-3 pt-2 pb-0 flex items-center gap-2 shrink-0"
                style={{ borderTop: "1px solid hsl(0 0% 14%)", background: "hsl(0 0% 8%)" }}
              >
                {attachment.type === "image" && attachment.previewUrl ? (
                  <img src={attachment.previewUrl} alt="attachment" className="w-10 h-10 rounded-sm object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-sm flex items-center justify-center" style={{ background: "hsl(0 0% 14%)" }}>
                    <FileText size={16} className="text-muted-foreground" />
                  </div>
                )}
                <span className="text-[10px] text-muted-foreground flex-1 truncate">{attachment.name}</span>
                <button onClick={clearAttachment} className="text-muted-foreground/50 hover:text-white transition-colors">
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Input */}
            <div
              className="px-3 py-3 border-t flex gap-2 items-center shrink-0"
              style={{
                borderColor: escalation !== "none" ? "hsl(142 60% 25% / 0.6)" : "hsl(350 85% 30% / 0.4)",
                background: "hsl(0 0% 8%)",
              }}
            >
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.txt,.log,.yml,.yaml,.json,.properties,.cfg,.conf,.toml"
                onChange={handleFileSelect}
                className="hidden"
                aria-label="Attach file"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || escalation === "creating" || escalation === "done"}
                className="text-muted-foreground/50 hover:text-muted-foreground transition-colors disabled:opacity-30 shrink-0"
                aria-label="Attach file"
                title="Attach image or text file"
              >
                <Paperclip size={14} />
              </button>
              <input
                ref={inputRef}
                type={escalation === "ask_email" ? "email" : "text"}
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, MAX_LENGTH))}
                onKeyDown={handleKey}
                placeholder={getPlaceholder()}
                disabled={loading || escalation === "creating" || escalation === "done"}
                className="flex-1 bg-transparent text-xs text-white placeholder:text-muted-foreground outline-none"
                aria-label="Chat input"
              />
              {escalation === "none" && (
                <span className="text-[10px] text-muted-foreground/40 shrink-0">{input.length}/{MAX_LENGTH}</span>
              )}
              {escalation === "done" && resetCountdown !== null && (
                <span className="text-[10px] text-muted-foreground/40 shrink-0">Resetting in {resetCountdown}s</span>
              )}
              <button
                onClick={() => send()}
                disabled={loading || (!input.trim() && !attachment) || escalation === "creating" || escalation === "done"}
                className="text-primary hover:brightness-125 disabled:opacity-40 transition-all"
                aria-label="Send message"
              >
                <Send size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nether AI Core orb */}
      <div className="relative flex items-center justify-center" style={{ width: 56, height: 56 }}>

        {/* Rotating ring — active when chat is open */}
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, rotate: 360 }}
            exit={{ opacity: 0 }}
            transition={{ rotate: { duration: 3, repeat: Infinity, ease: "linear" }, opacity: { duration: 0.2 } }}
            style={{
              position: "absolute",
              inset: -5,
              borderRadius: "50%",
              border: "2px solid transparent",
              borderTopColor: "hsl(350 85% 60%)",
              borderRightColor: "hsl(270 70% 60%)",
              pointerEvents: "none",
            }}
          />
        )}

        {/* Outer pulse ring — idle only */}
        {!open && (
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.45, 0, 0.45] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: "hsl(350 85% 50% / 0.25)",
              pointerEvents: "none",
            }}
          />
        )}

        {/* The orb button */}
        <motion.button
          onClick={() => setOpen(v => !v)}
          whileHover={{ scale: 1.1, boxShadow: "0 0 36px hsl(350 85% 55% / 0.9), 0 0 64px hsl(350 85% 40% / 0.45)" }}
          whileTap={{ scale: 0.92 }}
          animate={!open ? { y: [0, -4, 0] } : { y: 0 }}
          transition={!open ? { y: { duration: 3, repeat: Infinity, ease: "easeInOut" } } : {}}
          aria-label="Toggle AI chat"
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            position: "relative",
            cursor: "pointer",
            border: "none",
            padding: 0,
            background: open
              ? "radial-gradient(circle at 35% 35%, hsl(0 0% 18%), hsl(0 0% 8%))"
              : "radial-gradient(circle at 35% 35%, hsl(350 85% 62%), hsl(350 85% 36%))",
            boxShadow: open
              ? "0 0 20px hsl(350 85% 40% / 0.5), inset 0 1px 0 rgba(255,255,255,0.12)"
              : "0 0 24px hsl(350 85% 50% / 0.7), 0 0 48px hsl(350 85% 40% / 0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
        >
          {/* Specular highlight */}
          <div style={{
            position: "absolute", top: "18%", left: "20%",
            width: "28%", height: "28%", borderRadius: "50%",
            background: "rgba(255,255,255,0.32)", filter: "blur(2px)",
            pointerEvents: "none",
          }} />

          {/* Icon */}
          <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <AnimatePresence mode="wait">
              {open
                ? <motion.div key="x" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }} transition={{ duration: 0.18 }}>
                    <X size={18} color="white" />
                  </motion.div>
                : <motion.div key="msg" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} transition={{ duration: 0.18 }}>
                    <MessageSquare size={18} color="white" />
                  </motion.div>
              }
            </AnimatePresence>
          </div>
        </motion.button>
      </div>
    </div>
  );
};

export default ChatBot;
