import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, ExternalLink, Ticket } from "lucide-react";
import { Link } from "react-router-dom";

interface Message {
  role: "user" | "ai";
  text: string;
  showButtons?: boolean;
  recommendedPlan?: string | null;
  ramRequired?: string | null;
  isTicket?: boolean;
}

interface HistoryEntry {
  role: "user" | "assistant";
  content: string;
}

interface FlowState {
  step: string;
  players?: number;
  serverType?: string;
  plugins?: number;
  activity?: string;
  version?: string;
}

// Escalation sub-states
type EscalationStep = "none" | "ask_email" | "ask_issue" | "creating" | "done";

const MAX_LENGTH = 500;

const ChatBot = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", text: "Hey! I'm NetherNodes AI. Need help picking a plan or setting up your server?" },
  ]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [flowState, setFlowState] = useState<FlowState | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Escalation state
  const [escalation, setEscalation] = useState<EscalationStep>("none");
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingIssue, setPendingIssue] = useState("");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-chatbot", handler);
    return () => window.removeEventListener("open-chatbot", handler);
  }, []);

  const addAI = (text: string, extra?: Partial<Message>) => {
    setMessages(prev => [...prev, { role: "ai", text, ...extra }]);
  };

  // Build readable chat history string
  const buildHistory = () =>
    history.map(h => `${h.role === "user" ? "User" : "AI"}: ${h.content}`).join("\n");

  // Handle escalation sub-flow inputs
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
      // If we already have an issue from context, skip asking
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
        body: JSON.stringify({
          email,
          issue,
          chat_history: buildHistory(),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");      setEscalation("done");
      addAI(
        `✅ Your support ticket has been created (Ticket ID: ${data.ticket_id}).\n\nOur team will contact you at ${email} soon. You'll also receive a confirmation email.`,
        { isTicket: true }
      );
    } catch (err: any) {
      setEscalation("none");
      addAI("Sorry, I couldn't create the ticket right now. Please try again or email us directly at supportnethernodes@gmail.com");
    } finally {
      setLoading(false);
    }
  };

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    // Handle escalation sub-flow
    if (escalation === "ask_email" || escalation === "ask_issue") {
      await handleEscalationInput(text);
      return;
    }

    setInput("");
    setMessages(prev => [...prev, { role: "user", text }]);
    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history, flowState }),
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
        // Try to extract issue from last user message
        setPendingIssue(text);
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

            {/* Input */}
            <div
              className="px-3 py-3 border-t flex gap-2 items-center shrink-0"
              style={{
                borderColor: escalation !== "none" ? "hsl(142 60% 25% / 0.6)" : "hsl(350 85% 30% / 0.4)",
                background: "hsl(0 0% 8%)",
              }}
            >
              <input
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
              <button
                onClick={() => send()}
                disabled={loading || !input.trim() || escalation === "creating" || escalation === "done"}
                className="text-primary hover:brightness-125 disabled:opacity-40 transition-all"
                aria-label="Send message"
              >
                <Send size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <motion.button
        onClick={() => setOpen(v => !v)}
        whileTap={{ scale: 0.92 }}
        className="w-12 h-12 rounded-sm flex items-center justify-center transition-all"
        style={{
          background: open ? "hsl(0 0% 10%)" : "hsl(350 85% 45%)",
          border: "1px solid hsl(350 85% 50%)",
          boxShadow: "0 0 20px hsl(350 85% 40% / 0.5)",
        }}
        aria-label="Toggle AI chat"
      >
        {open ? <X size={20} color="white" /> : <MessageSquare size={20} color="white" />}
      </motion.button>
    </div>
  );
};

export default ChatBot;
