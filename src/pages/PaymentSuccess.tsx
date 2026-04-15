import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Mail, Clock, MessageSquare, FileText, Shield } from "lucide-react";
import Navbar from "@/components/Navbar";

const ease = [0.16, 1, 0.3, 1] as const;

// Animated "preparing" steps shown below the success card
const STEPS = [
  { label: "Payment confirmed",        done: true },
  { label: "Allocating server node",   done: true },
  { label: "Configuring environment",  done: false, active: true },
  { label: "Assigning credentials",    done: false },
  { label: "Sending access email",     done: false },
];

const PaymentSuccess = () => {
  const [params] = useSearchParams();
  const plan     = params.get("plan")       || "your plan";
  const email    = params.get("email")      || "";
  const paymentId = params.get("payment_id") || "";
  const orderId  = params.get("order_id")   || "";
  const isMock   = params.get("mock") === "true";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg space-y-4">

          {/* ── Main success card ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            className="glass-surface rounded-sm p-8"
            style={{ border: "1px solid hsl(142 60% 25%)", boxShadow: "0 0 40px hsl(142 60% 15% / 0.4)" }}
          >
            {/* Check icon */}
            <div className="flex items-start gap-5">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 220 }}
                className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "hsl(142 60% 10%)", border: "2px solid hsl(142 60% 30%)" }}
              >
                <CheckCircle size={28} className="text-green-400" />
              </motion.div>

              <div className="flex-1 min-w-0">
                <motion.h1
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25, ease }}
                  className="text-xl font-bold text-foreground tracking-tight mb-0.5"
                >
                  Payment Successful
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="text-sm text-muted-foreground"
                >
                  Your <span className="text-foreground font-medium">{plan}</span> server is being personally configured by our team.
                </motion.p>
              </div>
            </div>

            {/* Divider */}
            <div className="my-5" style={{ height: 1, background: "hsl(0 0% 14%)" }} />

            {/* Order details */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, ease }}
              className="space-y-2.5"
            >
              {orderId && (
                <div className="flex items-center justify-between rounded-sm px-4 py-3"
                  style={{ background: "hsl(0 0% 8%)", border: "1px solid hsl(0 0% 16%)" }}>
                  <div>
                    <p className="text-[9px] text-muted-foreground/40 mono uppercase tracking-wider mb-0.5">Order ID</p>
                    <p className="text-sm font-bold text-foreground mono">{orderId}</p>
                  </div>
                  <FileText size={16} className="text-muted-foreground/30" />
                </div>
              )}

              {email && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground px-1">
                  <Mail size={13} className="text-green-400 shrink-0" />
                  Invoice sent to <strong className="text-foreground">{email}</strong>
                </div>
              )}

              {paymentId && (
                <p className="text-[10px] text-muted-foreground/30 mono px-1">
                  Payment ID: {paymentId}
                </p>
              )}
            </motion.div>

            {isMock && (
              <div className="mt-4 rounded-sm px-3 py-2 text-xs"
                style={{ background: "hsl(38 90% 8%)", border: "1px solid hsl(38 90% 22%)", color: "hsl(38 90% 55%)" }}>
                Dev mode — mock payment
              </div>
            )}
          </motion.div>

          {/* ── Server preparation status ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, ease }}
            className="glass-surface rounded-sm p-6"
            style={{ border: "1px solid hsl(350 85% 25%)" }}
          >
            <div className="flex items-center gap-2 mb-4">
              {/* Pulsing dot */}
              <div className="relative w-2.5 h-2.5">
                <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-60" />
                <div className="relative w-2.5 h-2.5 rounded-full bg-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">Server Setup In Progress</p>
            </div>

            <div className="space-y-2.5 mb-5">
              {STEPS.map((step, i) => (
                <motion.div
                  key={step.label}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.55 + i * 0.07, ease }}
                  className="flex items-center gap-3"
                >
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: step.done
                        ? "hsl(142 60% 15%)"
                        : step.active
                        ? "hsl(350 85% 15%)"
                        : "hsl(0 0% 10%)",
                      border: `1px solid ${step.done ? "hsl(142 60% 30%)" : step.active ? "hsl(350 85% 35%)" : "hsl(0 0% 20%)"}`,
                    }}
                  >
                    {step.done ? (
                      <CheckCircle size={10} className="text-green-400" />
                    ) : step.active ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                        className="w-2 h-2 rounded-full border border-t-transparent"
                        style={{ borderColor: "hsl(350 85% 55%)", borderTopColor: "transparent" }}
                      />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(0 0% 25%)" }} />
                    )}
                  </div>
                  <span
                    className="text-xs"
                    style={{
                      color: step.done
                        ? "hsl(142 70% 55%)"
                        : step.active
                        ? "white"
                        : "hsl(0 0% 35%)",
                    }}
                  >
                    {step.label}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* ETA banner */}
            <div
              className="rounded-sm px-4 py-3 flex items-center gap-3"
              style={{ background: "hsl(350 85% 8%)", border: "1px solid hsl(350 85% 22%)" }}
            >
              <Clock size={14} className="text-primary shrink-0" />
              <div>
                <p className="text-xs font-semibold text-foreground">Estimated ready time: 2–4 hours</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  Early Access — your server is being personally configured by our team.
                  You'll receive panel access credentials via email once it's ready.
                </p>
              </div>
            </div>
          </motion.div>

          {/* ── What happens next ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, ease }}
            className="glass-surface rounded-sm p-6"
            style={{ border: "1px solid hsl(0 0% 16%)" }}
          >
            <p className="text-xs font-semibold text-foreground mb-3">What happens next</p>
            <div className="space-y-2.5">
              {[
                { icon: Mail,         text: `You'll receive your server credentials at ${email || "your email"} once setup is complete.` },
                { icon: Shield,       text: "Your server includes DDoS protection, daily backups, and full panel access." },
                { icon: MessageSquare, text: "Need help? Open the chat below — our AI can answer questions instantly." },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-start gap-3 text-xs text-muted-foreground">
                  <Icon size={13} className="text-primary shrink-0 mt-0.5" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Actions ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.75 }}
            className="flex gap-3"
          >
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("open-chatbot"))}
              className="flex-1 h-10 flex items-center justify-center gap-2 rounded-sm text-sm font-semibold transition-all hover:brightness-110"
              style={{ background: "hsl(350 85% 45%)", color: "white" }}
            >
              <MessageSquare size={14} /> Chat with Support
            </button>
            <a
              href="/"
              className="flex-1 h-10 flex items-center justify-center rounded-sm text-sm text-muted-foreground hover:text-foreground transition-colors"
              style={{ border: "1px solid hsl(0 0% 20%)" }}
            >
              Back to Home
            </a>
          </motion.div>

        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
