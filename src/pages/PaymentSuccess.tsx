import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Server, Mail, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";

const ease = [0.16, 1, 0.3, 1] as const;

const PaymentSuccess = () => {
  const [params] = useSearchParams();
  const plan = params.get("plan") || "your plan";
  const email = params.get("email") || "";
  const paymentId = params.get("payment_id") || "";
  const isMock = params.get("mock") === "true";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="glass-surface rounded-sm p-10 max-w-md w-full text-center"
          style={{ border: "1px solid hsl(142 60% 25%)" }}
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "hsl(142 60% 10%)", border: "2px solid hsl(142 60% 30%)" }}
          >
            <CheckCircle size={32} className="text-green-400" />
          </motion.div>

          <h1 className="text-2xl font-bold text-foreground tracking-tight mb-2">
            Payment Successful!
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Your <strong className="text-foreground">{plan}</strong> server is being set up.
          </p>

          {isMock && (
            <div className="rounded-sm px-3 py-2 text-xs mb-4" style={{ background: "hsl(38 90% 10%)", border: "1px solid hsl(38 90% 25%)", color: "hsl(38 90% 60%)" }}>
              Dev mode — mock payment. Real Razorpay keys needed for live payments.
            </div>
          )}

          <div className="space-y-3 mb-8 text-left">
            {email && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Mail size={13} className="text-primary shrink-0" />
                Server access details will be sent to <strong className="text-foreground">{email}</strong>
              </div>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Server size={13} className="text-primary shrink-0" />
              Your server will be ready in under 60 seconds
            </div>
            {paymentId && (
              <div className="text-[10px] text-muted-foreground/40 mono">
                Payment ID: {paymentId}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Link
              to="/support"
              className="w-full h-10 flex items-center justify-center gap-2 rounded-sm text-sm font-semibold transition-all hover:brightness-110"
              style={{ background: "hsl(350 85% 45%)", color: "white" }}
            >
              Go to Support <ArrowRight size={14} />
            </Link>
            <Link
              to="/"
              className="w-full h-10 flex items-center justify-center rounded-sm text-sm text-muted-foreground hover:text-foreground transition-colors"
              style={{ border: "1px solid hsl(0 0% 20%)" }}
            >
              Back to Home
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
