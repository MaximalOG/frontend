import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Globe, Shield, Loader2, CheckCircle, ArrowLeft, Tag, X, Zap, AlertCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useCurrency } from "@/hooks/useCurrency";
import { apiFetch } from "@/lib/api";

const ease = [0.16, 1, 0.3, 1] as const;

declare global { interface Window { Razorpay: any; } }

const SETUP_STEPS = [
  "Allocating server resources...",
  "Installing environment...",
  "Assigning IP address...",
  "Finalizing configuration...",
];

interface PlanInfo {
  name: string;
  ram: string;
  cpu: string;
  ssd: string;
  priceInr: number;
  tier: string;
  popular?: boolean;
}

const Checkout = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { currency, formatPrice } = useCurrency();

  const planName = params.get("plan") || "Starter";

  // Fetch plan from API
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError] = useState("");

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [couponStatus, setCouponStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [couponData, setCouponData] = useState<{ discount: number; type: "percent" | "fixed"; label: string } | null>(null);

  // Setup overlay
  const [setupStep, setSetupStep] = useState(0);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    setPlanLoading(true);
    setPlanError("");
    apiFetch(`/api/plans/${encodeURIComponent(planName)}`)
      .then(async res => {
        if (!res.ok) throw new Error("Plan not found");
        const data = await res.json();
        setPlan(data);
      })
      .catch(() => setPlanError("Could not load plan details. Please try again."))
      .finally(() => setPlanLoading(false));
  }, [planName]);

  // ── Early returns AFTER all hooks ────────────────────────────────────────────
  if (planLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (planError || !plan) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <AlertCircle className="w-10 h-10 text-primary mx-auto mb-4" />
            <p className="text-sm text-foreground mb-2">Could not load plan</p>
            <p className="text-xs text-muted-foreground mb-5">{planError || "Plan not found"}</p>
            <button
              onClick={() => navigate("/pricing")}
              className="px-5 py-2 rounded-sm text-sm font-semibold transition-all hover:brightness-110"
              style={{ background: "hsl(350 85% 45%)", color: "white" }}
            >
              Back to Pricing
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isFree = plan.priceInr === 0;

  // Calculate final price
  const discountedInr = (() => {
    if (!couponData || isFree) return plan.priceInr;
    if (couponData.type === "percent") return Math.round(plan.priceInr * (1 - couponData.discount / 100));
    return Math.max(0, plan.priceInr - couponData.discount);
  })();

  const displayPrice = isFree ? "Free" : formatPrice(discountedInr);
  const originalDisplay = formatPrice(plan.priceInr);
  const hasDiscount = couponData && discountedInr < plan.priceInr;

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponStatus("checking");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/sale/validate-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok && data.discount) {
        setCouponData({ discount: data.discount, type: data.discountType, label: data.label || `${data.discount}${data.discountType === "percent" ? "%" : "₹"} off` });
        setCouponStatus("valid");
      } else {
        setCouponData(null);
        setCouponStatus("invalid");
      }
    } catch {
      setCouponData(null);
      setCouponStatus("invalid");
    }
  };

  const removeCoupon = () => {
    setCouponData(null);
    setCouponInput("");
    setCouponStatus("idle");
  };

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const runSetupOverlay = (onDone: () => void) => {
    setShowSetup(true);
    setSetupStep(0);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setSetupStep(step);
      if (step >= SETUP_STEPS.length) {
        clearInterval(interval);
        setTimeout(onDone, 500);
      }
    }, 700);
  };

  const handlePay = async () => {
    if (!validateEmail(email)) { setEmailError("Please enter a valid email address."); return; }
    setEmailError(""); setError(""); setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planName,
          currency,
          userEmail: email,
          couponCode: couponStatus === "valid" ? couponInput.trim().toUpperCase() : undefined,
        }),
      });
      const order = await res.json();
      if (!res.ok || order.error) throw new Error(order.error || "Order creation failed");

      // Log for debugging — confirm backend applied discount
      console.log("[Checkout] Order received:", {
        originalPrice: order.originalPrice,
        discountAmount: order.discountAmount,
        finalPrice: order.finalPrice,
        razorpayAmount: order.amount, // in paise
      });

      if (order.mock) {
        runSetupOverlay(() => {
          setSuccess(true);
          navigate(`/payment-success?plan=${planName}&email=${encodeURIComponent(email)}&mock=true`);
        });
        return;
      }

      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://checkout.razorpay.com/v1/checkout.js";
          s.onload = () => resolve();
          s.onerror = () => reject(new Error("Failed to load payment SDK"));
          document.head.appendChild(s);
        });
      }

      const rzp = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        currency: "INR",
        name: "NetherNodes",
        description: order.discountAmount > 0
          ? `${planName} Plan — ₹${order.originalPrice} - ₹${order.discountAmount} discount = ₹${order.finalPrice}`
          : `${planName} Plan — ${plan.ram} RAM`,
        prefill: { email },
        theme: { color: "#e53935" },
        modal: { ondismiss: () => setLoading(false) },
        handler: async (response: any) => {
          try {
            const verify = await fetch(`${import.meta.env.VITE_API_URL}/api/verify-payment`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planName, userEmail: email,
              }),
            });
            const result = await verify.json();
            if (result.verified) {
              runSetupOverlay(() => {
                setSuccess(true);
                navigate(`/payment-success?plan=${planName}&email=${encodeURIComponent(email)}&payment_id=${response.razorpay_payment_id}`);
              });
            } else {
              setError("Payment verification failed. Please contact support.");
              setLoading(false);
            }
          } catch {
            setError("Verification error. Please contact support with your payment ID.");
            setLoading(false);
          }
        },
      });
      rzp.open();
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Setup overlay */}
      <AnimatePresence>
        {showSetup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-surface rounded-sm p-8 max-w-sm w-full mx-4 text-center"
              style={{ border: "1px solid hsl(350 85% 30%)" }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent mx-auto mb-6"
              />
              <h3 className="text-base font-bold text-foreground mb-4">Setting up your server</h3>
              <div className="space-y-2">
                {SETUP_STEPS.map((step, i) => (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: i <= setupStep ? 1 : 0.2, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-2 text-xs text-left"
                    style={{ color: i < setupStep ? "hsl(142 70% 55%)" : i === setupStep ? "white" : "hsl(0 0% 40%)" }}
                  >
                    {i < setupStep
                      ? <CheckCircle size={12} className="text-green-400 shrink-0" />
                      : i === setupStep
                      ? <Loader2 size={12} className="animate-spin shrink-0 text-primary" />
                      : <div className="w-3 h-3 rounded-full border border-muted-foreground/30 shrink-0" />
                    }
                    {step}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container mx-auto px-4 pt-24 pb-16 max-w-4xl">
        <button onClick={() => navigate("/pricing")}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft size={13} /> Back to Pricing
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* ── LEFT: Plan Summary ── */}
          <div className="glass-surface rounded-sm p-6 flex flex-col gap-4 relative overflow-hidden"
            style={{ border: "1px solid hsl(350 85% 35%)", boxShadow: "0 0 30px hsl(350 85% 30% / 0.2)" }}>

            {/* Animated border glow */}
            <div className="absolute inset-0 rounded-sm pointer-events-none"
              style={{ background: "linear-gradient(135deg, hsl(350 85% 30% / 0.08) 0%, transparent 60%)" }} />

            {/* Popular badge */}
            {plan.popular && (
              <div className="absolute top-3 right-3 px-2 py-0.5 rounded-sm text-[9px] font-bold mono uppercase flex items-center gap-1"
                style={{ background: "hsl(350 85% 45%)", color: "white" }}>
                🔥 Most Chosen
              </div>
            )}

            <div>
              <p className="text-[10px] text-muted-foreground/50 mono uppercase tracking-wider mb-1">Your Plan</p>
              <h2 className="text-2xl font-bold text-foreground tracking-tight">{planName}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{plan.tier} tier</p>
            </div>

            {/* Price with animation */}
            <div className="rounded-sm px-4 py-3" style={{ background: "hsl(350 85% 10%)", border: "1px solid hsl(350 85% 25%)" }}>
              <p className="text-[10px] text-muted-foreground/50 mono uppercase tracking-wider mb-1">Price Breakdown</p>
              <div className="flex items-baseline gap-2">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={displayPrice}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.2 }}
                    className="text-3xl font-black text-primary"
                  >
                    {displayPrice}
                  </motion.p>
                </AnimatePresence>
                {hasDiscount && (
                  <span className="text-sm line-through text-muted-foreground/50">{originalDisplay}</span>
                )}
              </div>
              <div className="mt-2 space-y-1 text-[10px] text-muted-foreground/50">
                <div className="flex justify-between"><span>Base price</span><span>{originalDisplay}/mo</span></div>
                <div className="flex justify-between"><span>Setup fee</span><span className="text-green-400">₹0</span></div>
                {hasDiscount && (
                  <div className="flex justify-between text-green-400">
                    <span>Coupon ({couponData?.label})</span>
                    <span>-{couponData?.type === "percent" ? `${couponData.discount}%` : `₹${couponData?.discount}`}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-foreground border-t border-border/30 pt-1 mt-1">
                  <span>Total today</span><span>{displayPrice}</span>
                </div>
              </div>
              {!isFree && <p className="text-[10px] text-muted-foreground/40 mt-1">per month · cancel anytime</p>}
            </div>

            {/* Specs */}
            <div className="space-y-2">
              <p className="text-[9px] text-muted-foreground/40 mono uppercase tracking-wider">Resources</p>
              {[{ label: "RAM", value: plan.ram }, { label: "CPU", value: plan.cpu }, { label: "SSD Storage", value: plan.ssd }].map(s => (
                <div key={s.label} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="text-foreground font-semibold">{s.value}</span>
                </div>
              ))}
            </div>

            {/* Included */}
            <div className="space-y-1.5 pt-2 border-t border-border/30">
              {["DDoS Protection", "Instant Setup", "Free Subdomain", "Full Panel Access"].map(f => (
                <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle size={11} className="text-primary shrink-0" />{f}
                </div>
              ))}
            </div>

            {/* Scarcity */}
            <div className="rounded-sm px-3 py-2 text-[10px] flex items-center gap-2"
              style={{ background: "hsl(38 90% 10%)", border: "1px solid hsl(38 90% 25%)", color: "hsl(38 90% 65%)" }}>
              <Zap size={11} className="shrink-0" />
              ⚡ Limited slots available — Early Access Phase
            </div>

            {/* Guarantee */}
            <div className="rounded-sm px-3 py-2 text-[10px] text-muted-foreground/60 flex items-center gap-2"
              style={{ background: "hsl(0 0% 8%)", border: "1px solid hsl(0 0% 14%)" }}>
              <Shield size={11} className="text-primary shrink-0" />
              48-hour money-back guarantee
            </div>
          </div>

          {/* ── RIGHT: Payment ── */}
          <div className="glass-surface rounded-sm p-6 flex flex-col gap-5" style={{ border: "1px solid hsl(0 0% 18%)" }}>
            <div>
              <h3 className="text-base font-bold text-foreground mb-1">Complete Your Order</h3>
              <p className="text-xs text-muted-foreground">Enter your email to receive server access details.</p>
            </div>

            {/* Email */}
            <div>
              <label className="text-[9px] text-muted-foreground/50 mono uppercase tracking-wider block mb-1.5">Email Address</label>
              <input type="email" value={email}
                onChange={e => { setEmail(e.target.value); setEmailError(""); }}
                placeholder="you@example.com"
                className="w-full rounded-sm px-3 py-2.5 text-sm text-foreground bg-transparent outline-none transition-all"
                style={{ border: emailError ? "1px solid hsl(350 85% 50%)" : "1px solid hsl(0 0% 22%)" }}
                onFocus={e => (e.currentTarget.style.borderColor = "hsl(350 85% 45%)")}
                onBlur={e => (e.currentTarget.style.borderColor = emailError ? "hsl(350 85% 50%)" : "hsl(0 0% 22%)")}
              />
              {emailError && <p className="text-[10px] mt-1" style={{ color: "hsl(350 85% 60%)" }}>{emailError}</p>}
            </div>

            {/* Coupon */}
            <div>
              <label className="text-[9px] text-muted-foreground/50 mono uppercase tracking-wider block mb-1.5">Coupon Code</label>
              <AnimatePresence mode="wait">
                {couponStatus === "valid" && couponData ? (
                  <motion.div key="applied" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between px-3 py-2 rounded-sm text-xs"
                    style={{ background: "hsl(142 60% 10%)", border: "1px solid hsl(142 60% 25%)", color: "hsl(142 70% 55%)" }}>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={12} />
                      <span>Coupon applied — <strong>{couponData.label}</strong></span>
                    </div>
                    <button onClick={removeCoupon} className="text-muted-foreground/50 hover:text-white transition-colors">
                      <X size={12} />
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex rounded-sm overflow-hidden"
                    style={{ border: couponStatus === "invalid" ? "1px solid hsl(350 85% 40%)" : "1px solid hsl(0 0% 22%)", background: "hsl(0 0% 8%)" }}>
                    <Tag size={13} className="text-muted-foreground ml-3 self-center shrink-0" />
                    <input value={couponInput}
                      onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponStatus("idle"); }}
                      onKeyDown={e => e.key === "Enter" && applyCoupon()}
                      placeholder="Enter coupon code"
                      className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/40 outline-none px-2 py-2.5 mono tracking-widest"
                    />
                    <button onClick={applyCoupon} disabled={!couponInput.trim() || couponStatus === "checking"}
                      className="px-3 text-xs font-semibold transition-all disabled:opacity-40"
                      style={{ background: "hsl(350 85% 45%)", color: "white", borderLeft: "1px solid hsl(350 85% 35%)" }}>
                      {couponStatus === "checking" ? <Loader2 size={12} className="animate-spin" /> : "Apply"}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              {couponStatus === "invalid" && (
                <p className="text-[10px] mt-1" style={{ color: "hsl(350 85% 60%)" }}>Invalid or expired coupon code.</p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-sm px-3 py-2 text-xs" style={{ background: "hsl(350 85% 10%)", border: "1px solid hsl(350 85% 30%)", color: "hsl(350 85% 65%)" }}>
                {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="rounded-sm px-3 py-3 text-xs flex items-center gap-2"
                style={{ background: "hsl(142 60% 10%)", border: "1px solid hsl(142 60% 25%)", color: "hsl(142 70% 55%)" }}>
                <CheckCircle size={14} /> Payment successful! Redirecting…
              </motion.div>
            )}

            {/* Pay button */}
            {!success && (
              <motion.button
                onClick={handlePay}
                disabled={loading || isFree}
                whileHover={{ scale: 1.02, boxShadow: "0 0 32px hsl(350 85% 50% / 0.6)" }}
                whileTap={{ scale: 0.98 }}
                className="w-full h-12 rounded-sm font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{ background: "hsl(350 85% 45%)", color: "white", boxShadow: "0 0 20px hsl(350 85% 40% / 0.4)" }}
              >
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> Setting up your server…</>
                ) : (
                  <><Zap size={14} /> {isFree ? "Free Plan" : `⚡ Launch My Server — ${displayPrice}`}</>
                )}
              </motion.button>
            )}

            {/* Trust signals */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { icon: Lock,       label: "256-bit SSL Secured" },
                { icon: Zap,        label: "Instant Server Setup" },
                { icon: Globe,      label: "Trusted Platform" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1 text-center">
                  <Icon size={14} className="text-muted-foreground/50" />
                  <span className="text-[9px] text-muted-foreground/40 leading-tight">{label}</span>
                </div>
              ))}
            </div>

            <p className="text-[9px] text-muted-foreground/30 text-center">
              Payments processed securely. Your data is encrypted.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Checkout;
