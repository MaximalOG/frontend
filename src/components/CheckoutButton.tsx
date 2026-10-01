import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Server, Loader2 } from "lucide-react";
import { type Currency } from "@/hooks/useCurrency";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

interface ReclaimableSub {
  subscriptionId: string;
  planName: string;
  status: string;
}

interface Props {
  planName: string;
  planPriceInr?: number;
  discountedPriceInr?: number;
  currency?: Currency;
  label: string;
  isPopular?: boolean;
  className?: string;
  // If this plan has an active subscription with no server, pass it here
  reclaimableSub?: ReclaimableSub | null;
}

const CheckoutButton = ({ planName, label, isPopular, className, reclaimableSub }: Props) => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [reclaiming, setReclaiming] = useState(false);
  const [reclaimErr, setReclaimErr] = useState("");

  // ── Reclaim flow — active sub, no server ─────────────────────────────────
  if (reclaimableSub) {
    const handleReclaim = async (e: React.MouseEvent) => {
      e.stopPropagation();
      setReclaiming(true); setReclaimErr("");
      try {
        const res = await apiFetch(`/api/subscriptions/${reclaimableSub.subscriptionId}/reclaim`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        });
        let data: any = {};
        try { data = await res.json(); } catch {}
        if (!res.ok) { setReclaimErr(data.error || "Failed to create server."); setReclaiming(false); return; }
        navigate(`/setup-server?server=${data.serverId}`);
      } catch {
        setReclaimErr("Network error. Please try again.");
        setReclaiming(false);
      }
    };

    return (
      <div className={className}>
        <button
          onClick={handleReclaim}
          disabled={reclaiming}
          className={`w-full h-9 flex items-center justify-center gap-1.5 rounded-sm font-medium text-xs transition-all disabled:opacity-60 ${
            isPopular
              ? "bg-primary text-primary-foreground nether-glow hover:brightness-110"
              : "bg-muted text-foreground hover:bg-muted/80"
          }`}
        >
          {reclaiming
            ? <><Loader2 size={11} className="animate-spin" /> Creating…</>
            : <><Server size={11} /> Create Server</>}
        </button>
        {reclaimErr && (
          <p className="text-[10px] text-red-400 mt-1 text-center">{reclaimErr}</p>
        )}
        <p className="text-[9px] text-center mt-1" style={{ color: "hsl(142 70% 55%)" }}>
          ✓ Active subscription — no payment needed
        </p>
      </div>
    );
  }

  // ── Normal checkout flow ──────────────────────────────────────────────────
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/checkout?plan=${encodeURIComponent(planName)}`);
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full h-9 flex items-center justify-center gap-1.5 rounded-sm font-medium text-xs transition-all ${
        isPopular
          ? "bg-primary text-primary-foreground nether-glow hover:brightness-110"
          : "bg-muted text-foreground hover:bg-muted/80"
      } ${className ?? ""}`}
    >
      <Lock size={11} />
      {label}
    </button>
  );
};

export default CheckoutButton;
