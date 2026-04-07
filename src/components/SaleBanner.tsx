import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tag, X, Clock, Sparkles } from "lucide-react";

interface SaleData {
  enabled: boolean;
  label: string;
  discount: number;
  discountType: "percent" | "fixed";
  mode: "public" | "secret";
  endDate: string | null;
  showCountdown: boolean;
  plans: "all" | string[];
}

function useCountdown(endDate: string | null) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    if (!endDate) return;
    const tick = () => {
      const diff = new Date(endDate).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Expired"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endDate]);
  return timeLeft;
}

const SaleBanner = () => {
  const [sale, setSale] = useState<SaleData | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const countdown = useCountdown(sale?.endDate ?? null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/sale`)
      .then(r => r.json())
      .then(data => { if (data) setSale(data); })
      .catch(() => {});
  }, []);

  if (!sale || sale.mode !== "public" || dismissed) return null;

  const discountText = sale.discountType === "percent"
    ? `${sale.discount}% OFF`
    : `₹${sale.discount} OFF`;

  return (
    <AnimatePresence>
      <motion.div
        key="sale-banner"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: "fixed",
          top: 64, // sits right below the 64px navbar
          left: 0,
          right: 0,
          zIndex: 49, // just below navbar (z-50) so navbar stays on top
          overflow: "hidden",
        }}
      >
        {/* Animated gradient background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(90deg, hsl(350 85% 18%), hsl(270 70% 22%), hsl(350 85% 18%), hsl(270 70% 22%))",
            backgroundSize: "300% 100%",
            animation: "saleGradient 5s ease infinite",
          }}
        />

        {/* Shimmer sweep */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.06) 50%, transparent 65%)",
            animation: "saleShimmer 3s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />

        {/* Bottom glow line */}
        <div style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          height: 1,
          background: "linear-gradient(90deg, transparent, hsl(350 85% 55% / 0.8), hsl(270 70% 60% / 0.8), transparent)",
        }} />

        {/* Content */}
        <div className="container mx-auto px-4 relative z-10 flex items-center justify-between gap-4" style={{ height: 56 }}>
          {/* Centered content */}
          <div className="flex-1 flex items-center justify-center gap-4 flex-wrap">
            <motion.div
              animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles size={18} className="text-yellow-400" />
            </motion.div>

            <span className="text-base font-bold text-white tracking-wide">{sale.label}</span>

            <motion.span
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="px-3 py-1 rounded-sm text-base font-black mono"
              style={{
                background: "hsl(350 85% 45%)",
                color: "white",
                boxShadow: "0 0 16px hsl(350 85% 50% / 0.6)",
                letterSpacing: "0.05em",
              }}
            >
              {discountText}
            </motion.span>

            {/* Show which plans if not all */}
            {sale.plans !== "all" && Array.isArray(sale.plans) && (sale.plans as string[]).length > 0 && (
              <span className="text-xs text-white/70 hidden sm:block">
                on {(sale.plans as string[]).join(", ")}
              </span>
            )}

            {sale.showCountdown && sale.endDate && countdown && countdown !== "Expired" && (
              <div
                className="flex items-center gap-1.5 px-3 py-1 rounded-sm text-sm font-medium"
                style={{
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.8)",
                }}
              >
                <Clock size={13} className="text-yellow-400" />
                <span>Ends in <strong className="text-white">{countdown}</strong></span>
              </div>
            )}
          </div>

          <button
            onClick={() => setDismissed(true)}
            className="text-white/40 hover:text-white transition-colors shrink-0 p-1"
            aria-label="Dismiss sale banner"
          >
            <X size={15} />
          </button>
        </div>
      </motion.div>

      {/* Spacer so page content doesn't hide under the banner */}
      <div key="sale-spacer" style={{ height: 56 }} />
    </AnimatePresence>
  );
};

export default SaleBanner;
