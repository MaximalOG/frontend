import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tag, Check, X, Loader2 } from "lucide-react";

export interface DiscountInfo {
  discount: number;
  discountType: "percent" | "fixed";
  label: string;
  plans: "all" | string[];
}

interface Props {
  onDiscount: (info: DiscountInfo | null) => void;
}

const PromoCode = ({ onDiscount }: Props) => {
  const [mode, setMode] = useState<"idle" | "secret">("idle");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [info, setInfo] = useState<DiscountInfo | null>(null);

  // Check if there's a public sale active on mount
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/sale`)
      .then(r => r.json())
      .then(data => {
        if (data && data.mode === "public") {
          const d: DiscountInfo = { discount: data.discount, discountType: data.discountType, label: data.label, plans: data.plans ?? "all" };
          setInfo(d);
          onDiscount(d);
          setStatus("valid");
        } else if (data && (data.mode === "secret" || data.mode === "multi")) {
          setMode("secret");
        }
      })
      .catch(() => {});
  }, []);

  const check = async () => {
    if (!code.trim()) return;
    setStatus("checking");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/sale/validate-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        const d: DiscountInfo = await res.json();
        // Ensure plans field exists
        if (!d.plans) d.plans = "all";
        setInfo(d);
        onDiscount(d);
        setStatus("valid");
      } else {
        setInfo(null);
        onDiscount(null);
        setStatus("invalid");
      }
    } catch {
      setStatus("invalid");
    }
  };

  const remove = () => {
    setCode("");
    setInfo(null);
    onDiscount(null);
    setStatus("idle");
  };

  // Public sale auto-applied
  if (mode === "idle" && status === "valid" && info) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center gap-2 text-xs"
        style={{ color: "hsl(142 70% 55%)" }}
      >
        <Check size={13} className="shrink-0" />
        <span><strong>{info.label}</strong> — {info.discountType === "percent" ? `${info.discount}% off` : `₹${info.discount} off`} applied automatically</span>
      </motion.div>
    );
  }

  // Secret code mode
  if (mode === "secret") {
    return (
      <div className="flex flex-col gap-2">
        <AnimatePresence mode="wait">
          {status === "valid" && info ? (
            <motion.div
              key="valid"
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-sm text-xs"
              style={{ background: "hsl(142 60% 10%)", border: "1px solid hsl(142 60% 25%)", color: "hsl(142 70% 55%)" }}
            >
              <div className="flex items-center gap-2">
                <Check size={12} />
                <span><strong>{info.label}</strong> — {info.discountType === "percent" ? `${info.discount}% off` : `₹${info.discount} off`}</span>
              </div>
              <button onClick={remove} className="text-muted-foreground hover:text-white transition-colors">
                <X size={12} />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="input"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center rounded-sm overflow-hidden"
              style={{ border: status === "invalid" ? "1px solid hsl(350 85% 40%)" : "1px solid hsl(0 0% 20%)", background: "hsl(0 0% 8%)" }}
            >
              <Tag size={13} className="text-muted-foreground ml-3 shrink-0" />
              <input
                type="text"
                value={code}
                onChange={e => { setCode(e.target.value.toUpperCase()); setStatus("idle"); }}
                onKeyDown={e => e.key === "Enter" && check()}
                placeholder="Enter promo code"
                className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/40 outline-none px-2 py-2.5 mono tracking-widest"
              />
              <button
                onClick={check}
                disabled={!code.trim() || status === "checking"}
                className="px-3 py-2.5 text-xs font-semibold transition-all disabled:opacity-40 shrink-0"
                style={{ background: "hsl(350 85% 45%)", color: "white", borderLeft: "1px solid hsl(350 85% 35%)" }}
              >
                {status === "checking" ? <Loader2 size={12} className="animate-spin" /> : "Apply"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        {status === "invalid" && (
          <p className="text-[10px]" style={{ color: "hsl(350 85% 60%)" }}>Invalid or expired code.</p>
        )}
      </div>
    );
  }

  return null;
};

export default PromoCode;
