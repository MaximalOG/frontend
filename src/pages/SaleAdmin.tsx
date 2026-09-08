import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tag, Save, ToggleLeft, ToggleRight, RefreshCw, Plus, Trash2,
  ChevronDown, ChevronUp, Infinity as InfinityIcon, Calendar,
  Percent, Hash, Copy, Check, Shield,
} from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";

const PLANS = ["Nano", "Basic", "Plus", "Starter", "Pro", "Elite", "Ultra", "Max", "Titan"];
const ease = [0.16, 1, 0.3, 1] as const;

interface PromoCode {
  name: string;
  code: string;
  discount: number;
  discountType: "percent" | "fixed";
  note: string;
  plans: "all" | string[];
  maxUses: number;
  usedCount: number;
  /** "lifetime" = server is free forever, "months" = free for N months then billed */
  freeType: "lifetime" | "months";
  freeMonths: number | null;
}

interface SaleConfig {
  enabled: boolean;
  label: string;
  discount: number;
  discountType: "percent" | "fixed";
  mode: "public" | "secret" | "multi";
  code: string;
  codes: PromoCode[];
  plans: "all" | string[];
  startDate: string | null;
  endDate: string | null;
  showCountdown: boolean;
  neverExpires: boolean;
}

const DEFAULT: SaleConfig = {
  enabled: false, label: "Limited Time Offer", discount: 20,
  discountType: "percent", mode: "public", code: "", codes: [],
  plans: "all", startDate: null, endDate: null,
  showCountdown: true, neverExpires: true,
};

const EMPTY_CODE: PromoCode = {
  name: "", code: "", discount: 100, discountType: "percent",
  note: "", plans: "all", maxUses: 0, usedCount: 0,
  freeType: "lifetime", freeMonths: null,
};

/* ── tiny helpers ─────────────────────────────────────── */
const isFree = (c: PromoCode) => c.discountType === "percent" && c.discount >= 100;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl px-4 py-3"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <p className="text-[9px] mono uppercase tracking-widest mb-2" style={{ color: "#475569" }}>{label}</p>
      {children}
    </div>
  );
}

/* ── plan pill row ──────────────────────────────────────── */
function PlanPicker({
  value, onChange,
}: { value: "all" | string[]; onChange: (v: "all" | string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      <button onClick={() => onChange(value === "all" ? [] : "all")}
        className="px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all"
        style={{
          background: value === "all" ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.04)",
          color: value === "all" ? "#f87171" : "#475569",
          border: `1px solid ${value === "all" ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.08)"}`,
        }}>
        All
      </button>
      {PLANS.map(plan => {
        const sel = value !== "all" && (value as string[]).includes(plan);
        return (
          <button key={plan} onClick={() => {
            if (value === "all") { onChange(PLANS.filter(p => p !== plan)); return; }
            const arr = value as string[];
            onChange(sel ? arr.filter(p => p !== plan) : [...arr, plan]);
          }}
            className="px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all"
            style={{
              background: (value === "all" || sel) ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.04)",
              color: (value === "all" || sel) ? "#c4b5fd" : "#475569",
              border: `1px solid ${(value === "all" || sel) ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.08)"}`,
            }}>
            {plan}
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════ MAIN PAGE ═══════════════════════ */
export default function SaleAdmin() {
  const [config, setConfig]           = useState<SaleConfig>(DEFAULT);
  const [loading, setLoading]         = useState(true);
  const [savingBanner, setSavingBanner] = useState(false);
  const [savedBanner, setSavedBanner]   = useState(false);
  const [savingCodes, setSavingCodes]   = useState(false);
  const [savedCodes, setSavedCodes]     = useState(false);
  const [expandedCode, setExpandedCode] = useState<number | null>(null);
  const [copiedIdx, setCopiedIdx]       = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/sale`);
      const data = await res.json();
      setConfig({
        ...DEFAULT, ...data,
        neverExpires: !data.endDate,
        codes: (data.codes ?? []).map((c: any) => ({
          ...EMPTY_CODE, ...c,
          freeType:   c.freeType   ?? "lifetime",
          freeMonths: c.freeMonths ?? null,
        })),
      });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const set = (key: keyof SaleConfig, value: any) =>
    setConfig(prev => ({ ...prev, [key]: value }));

  const addCode = () => {
    set("codes", [...config.codes, { ...EMPTY_CODE }]);
    setExpandedCode(config.codes.length); // auto-expand new row
  };

  const removeCode = async (i: number) => {
    const updated = config.codes.filter((_, idx) => idx !== i);
    set("codes", updated);
    if (expandedCode === i) setExpandedCode(null);
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/admin/sale`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, codes: updated, endDate: config.neverExpires ? null : config.endDate }),
      });
    } catch { /* silent */ }
  };

  const updateCode = (i: number, field: keyof PromoCode, value: any) => {
    set("codes", config.codes.map((c, idx) =>
      idx === i ? { ...c, [field]: field === "code" ? String(value).toUpperCase().replace(/\s/g, "") : value } : c
    ));
  };

  const copyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1800);
    });
  };

  const { hasPermission } = useAdminAuth();
  const canBanner = hasPermission("banner_sale");
  const canCodes  = hasPermission("promo_codes");

  const saveSection = async (section: "banner" | "codes") => {
    const setSaving = section === "banner" ? setSavingBanner : setSavingCodes;
    const setSaved  = section === "banner" ? setSavedBanner  : setSavedCodes;
    setSaving(true);
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/admin/sale`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, endDate: config.neverExpires ? null : config.endDate }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <RefreshCw className="w-5 h-5 animate-spin" style={{ color: "#475569" }} />
    </div>
  );

  return (
    <div className="min-h-screen pb-24" style={{ background: "#080810" }}>
      <div className="container mx-auto px-4 max-w-6xl pt-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>

          {/* ── Page header ── */}
          <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5" style={{ color: "#f1f5f9" }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}>
                  <Tag size={15} style={{ color: "#f87171" }} />
                </div>
                Sale Manager
              </h1>
              <p className="text-sm mt-1" style={{ color: "#475569" }}>Manage banner discounts and promo codes</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

            {/* ══════════════════════════════════════════
                LEFT: BANNER SALE  (2/5 width)
            ══════════════════════════════════════════ */}
            <div className="lg:col-span-2">
              {canBanner ? (
                <div className="rounded-2xl overflow-hidden"
                  style={{ background: "linear-gradient(135deg, #0d0d18, #100d1a)", border: "1px solid rgba(239,68,68,0.2)" }}>

                  {/* Header */}
                  <div className="px-5 py-4 flex items-center justify-between"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div>
                      <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: "#f1f5f9" }}>
                        <span className="w-2 h-2 rounded-full"
                          style={{ background: config.enabled ? "#22c55e" : "#475569", boxShadow: config.enabled ? "0 0 6px #22c55e" : "none" }} />
                        Public Banner Sale
                      </h2>
                      <p className="text-[10px] mt-0.5" style={{ color: "#475569" }}>Shown automatically — no code needed</p>
                    </div>
                    <button onClick={() => set("enabled", !config.enabled)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: config.enabled ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.04)",
                        color:      config.enabled ? "#4ade80" : "#64748b",
                        border:     `1px solid ${config.enabled ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.08)"}`,
                      }}>
                      {config.enabled ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                      {config.enabled ? "Live" : "Off"}
                    </button>
                  </div>

                  <div className="p-5 space-y-3">
                    <Field label="Banner Label">
                      <input value={config.label} onChange={e => set("label", e.target.value)}
                        placeholder="e.g. Launch Offer, Weekend Deal"
                        className="w-full bg-transparent text-sm outline-none" style={{ color: "#f1f5f9" }} />
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Discount Amount">
                        <input type="number" min={1} max={100} value={config.discount}
                          onChange={e => set("discount", Number(e.target.value))}
                          className="w-full bg-transparent text-sm outline-none" style={{ color: "#f1f5f9" }} />
                      </Field>
                      <Field label="Type">
                        <select value={config.discountType} onChange={e => set("discountType", e.target.value as any)}
                          className="w-full bg-transparent text-sm outline-none" style={{ color: "#f1f5f9", background: "transparent" }}>
                          <option value="percent" style={{ background: "#1e1b2e" }}>Percentage (%)</option>
                          <option value="fixed"   style={{ background: "#1e1b2e" }}>Fixed Amount (₹)</option>
                        </select>
                      </Field>
                    </div>

                    <Field label="Apply to Plans">
                      <PlanPicker value={config.plans}
                        onChange={v => set("plans", v)} />
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Start Date (optional)">
                        <input type="datetime-local"
                          value={config.startDate ? config.startDate.slice(0, 16) : ""}
                          onChange={e => set("startDate", e.target.value ? new Date(e.target.value).toISOString() : null)}
                          className="w-full bg-transparent text-sm outline-none" style={{ color: "#f1f5f9", colorScheme: "dark" }} />
                      </Field>
                      <Field label="End Date">
                        <label className="flex items-center gap-2 mb-2 cursor-pointer">
                          <input type="checkbox" checked={config.neverExpires}
                            onChange={e => set("neverExpires", e.target.checked)} className="accent-primary" />
                          <span className="text-xs" style={{ color: "#94a3b8" }}>Never expires</span>
                        </label>
                        {!config.neverExpires && (
                          <input type="datetime-local"
                            value={config.endDate ? config.endDate.slice(0, 16) : ""}
                            onChange={e => set("endDate", e.target.value ? new Date(e.target.value).toISOString() : null)}
                            className="w-full bg-transparent text-sm outline-none" style={{ color: "#f1f5f9", colorScheme: "dark" }} />
                        )}
                      </Field>
                    </div>

                    <label className="flex items-center gap-2 px-1 cursor-pointer">
                      <input type="checkbox" checked={config.showCountdown}
                        onChange={e => set("showCountdown", e.target.checked)} className="accent-primary" />
                      <span className="text-xs" style={{ color: "#94a3b8" }}>Show countdown timer in banner</span>
                    </label>

                    <button onClick={() => saveSection("banner")} disabled={savingBanner}
                      className="w-full h-9 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{ background: "linear-gradient(135deg, #991b1b, #dc2626)", color: "white" }}>
                      {savingBanner ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                      {savedBanner ? "Saved!" : savingBanner ? "Saving…" : "Save Banner Settings"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl p-5 opacity-50 cursor-not-allowed"
                  style={{ background: "#0d0d18", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <p className="text-sm font-bold flex items-center gap-2" style={{ color: "#64748b" }}>
                    <Shield size={14} /> Banner Sale — No Access
                  </p>
                  <p className="text-xs mt-1" style={{ color: "#334155" }}>You don't have permission to manage the banner sale.</p>
                </div>
              )}
            </div>

            {/* ══════════════════════════════════════════
                RIGHT: PROMO CODES  (3/5 width)
            ══════════════════════════════════════════ */}
            <div className="lg:col-span-3">
              {canCodes ? (
                <div className="rounded-2xl overflow-hidden"
                  style={{ background: "linear-gradient(135deg, #0d0d18, #0f0d1c)", border: "1px solid rgba(139,92,246,0.2)" }}>

                  {/* Header */}
                  <div className="px-5 py-4 flex items-center justify-between"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div>
                      <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: "#f1f5f9" }}>
                        <Tag size={14} style={{ color: "#a78bfa" }} /> Promo Codes
                        {config.codes.length > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold mono"
                            style={{ background: "rgba(139,92,246,0.15)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.25)" }}>
                            {config.codes.length}
                          </span>
                        )}
                      </h2>
                      <p className="text-[10px] mt-0.5" style={{ color: "#475569" }}>Secret codes for employees, creators &amp; partners</p>
                    </div>
                    <button onClick={addCode}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                      style={{ background: "rgba(139,92,246,0.15)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.25)" }}>
                      <Plus size={12} /> New Code
                    </button>
                  </div>

                  {/* ── Column header row ── */}
                  {config.codes.length > 0 && (
                    <div className="grid px-5 py-2 text-[9px] mono uppercase tracking-widest"
                      style={{ gridTemplateColumns: "1fr 130px 80px 70px 32px", gap: "0 12px", color: "#334155", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <span>Label / Code</span>
                      <span>Plans</span>
                      <span>Discount</span>
                      <span>Uses</span>
                      <span />
                    </div>
                  )}

                  {/* ── Code rows ── */}
                  {config.codes.length === 0 ? (
                    <div className="py-14 text-center">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                        style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)" }}>
                        <Tag size={18} style={{ color: "#6d28d9" }} />
                      </div>
                      <p className="text-sm font-semibold" style={{ color: "#64748b" }}>No promo codes yet</p>
                      <p className="text-xs mt-1" style={{ color: "#334155" }}>Click "New Code" to create one</p>
                    </div>
                  ) : (
                    <div>
                      {config.codes.map((c, i) => {
                        const free     = isFree(c);
                        const isOpen   = expandedCode === i;
                        const usedPct  = c.maxUses > 0 ? Math.min((c.usedCount / c.maxUses) * 100, 100) : 0;
                        const exhausted = c.maxUses > 0 && c.usedCount >= c.maxUses;

                        return (
                          <motion.div key={i}
                            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>

                            {/* ── Summary row (always visible) ── */}
                            <div className="grid items-center px-5 py-3 cursor-pointer group transition-colors"
                              style={{ gridTemplateColumns: "1fr 130px 80px 70px 32px", gap: "0 12px" }}
                              onClick={() => setExpandedCode(isOpen ? null : i)}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>

                              {/* Name + Code */}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-semibold truncate" style={{ color: "#e2e8f0" }}>
                                    {c.name || <span style={{ color: "#334155", fontStyle: "italic" }}>Unnamed</span>}
                                  </p>
                                  {free && (
                                    <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-bold mono"
                                      style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }}>
                                      {c.freeType === "months" && c.freeMonths ? `${c.freeMonths}mo FREE` : "FREE"}
                                    </span>
                                  )}
                                  {exhausted && (
                                    <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-bold mono"
                                      style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
                                      MAXED
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[11px] mono tracking-widest" style={{ color: "#7c3aed" }}>
                                    {c.code || <span style={{ color: "#1e293b" }}>—</span>}
                                  </span>
                                  {c.code && (
                                    <button onClick={e => { e.stopPropagation(); copyCode(c.code, i); }}
                                      className="transition-colors"
                                      style={{ color: copiedIdx === i ? "#4ade80" : "#334155" }}>
                                      {copiedIdx === i ? <Check size={10} /> : <Copy size={10} />}
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Plans summary */}
                              <div className="truncate text-[10px] mono" style={{ color: "#64748b" }}>
                                {c.plans === "all"
                                  ? "All plans"
                                  : Array.isArray(c.plans)
                                    ? c.plans.length === 0 ? <span style={{ color: "#ef4444" }}>None</span> : c.plans.join(", ")
                                    : "All plans"}
                              </div>

                              {/* Discount */}
                              <div className="text-xs font-bold mono" style={{ color: free ? "#4ade80" : "#a78bfa" }}>
                                {free ? "100% off" : c.discountType === "percent" ? `${c.discount}%` : `₹${c.discount}`}
                              </div>

                              {/* Uses */}
                              <div className="text-[11px] mono" style={{ color: exhausted ? "#f87171" : "#64748b" }}>
                                {c.usedCount}{c.maxUses > 0 ? `/${c.maxUses}` : ""}
                              </div>

                              {/* Expand chevron */}
                              <div className="flex items-center justify-end">
                                {isOpen
                                  ? <ChevronUp  size={14} style={{ color: "#475569" }} />
                                  : <ChevronDown size={14} style={{ color: "#475569" }} />}
                              </div>
                            </div>

                            {/* ── Expanded detail panel ── */}
                            <AnimatePresence initial={false}>
                              {isOpen && (
                                <motion.div
                                  key="detail"
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                                  style={{ overflow: "hidden" }}>
                                  <div className="px-5 pb-5 pt-3 space-y-4"
                                    style={{ background: "rgba(139,92,246,0.04)", borderTop: "1px solid rgba(255,255,255,0.04)" }}>

                                    {/* Row 1: Label + Code */}
                                    <div className="grid grid-cols-2 gap-3">
                                      <Field label="Label">
                                        <input value={c.name} onChange={e => updateCode(i, "name", e.target.value)}
                                          placeholder="e.g. Employee, Creator, Partner"
                                          className="w-full bg-transparent text-sm outline-none" style={{ color: "#f1f5f9" }} />
                                      </Field>
                                      <Field label="Code">
                                        <input value={c.code} onChange={e => updateCode(i, "code", e.target.value)}
                                          placeholder="STAFF100"
                                          className="w-full bg-transparent text-sm outline-none mono tracking-widest font-bold"
                                          style={{ color: "#c4b5fd" }} />
                                      </Field>
                                    </div>

                                    {/* Row 2: Discount — only shown if not 100% free */}
                                    <div className="grid grid-cols-3 gap-3">
                                      <Field label="Discount">
                                        <div className="flex items-center gap-1.5">
                                          <input type="number" min={1} max={100} value={c.discount}
                                            onChange={e => updateCode(i, "discount", Number(e.target.value))}
                                            className="w-full bg-transparent text-sm outline-none" style={{ color: "#f1f5f9" }} />
                                          <span className="text-muted-foreground/40 text-sm">
                                            {c.discountType === "percent" ? <Percent size={12} /> : <Hash size={12} />}
                                          </span>
                                        </div>
                                      </Field>
                                      <Field label="Type">
                                        <select value={c.discountType}
                                          onChange={e => updateCode(i, "discountType", e.target.value as any)}
                                          className="w-full bg-transparent text-sm outline-none" style={{ color: "#f1f5f9", background: "transparent" }}>
                                          <option value="percent" style={{ background: "#1e1b2e" }}>Percent (%)</option>
                                          <option value="fixed"   style={{ background: "#1e1b2e" }}>Fixed (₹)</option>
                                        </select>
                                      </Field>
                                      <Field label="Max Uses (0=∞)">
                                        <input type="number" min={0} value={c.maxUses ?? 0}
                                          onChange={e => updateCode(i, "maxUses", Number(e.target.value))}
                                          className="w-full bg-transparent text-sm outline-none" style={{ color: "#f1f5f9" }} />
                                      </Field>
                                    </div>

                                    {/* Row 3: Free server duration — only visible when 100% discount */}
                                    {free && (
                                      <div className="rounded-xl p-4"
                                        style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.18)" }}>
                                        <p className="text-[9px] mono uppercase tracking-widest mb-3 flex items-center gap-1.5" style={{ color: "#4ade80" }}>
                                          <InfinityIcon size={10} /> Free Server Duration
                                        </p>
                                        <div className="flex gap-2">
                                          {/* Lifetime toggle */}
                                          <button onClick={() => { updateCode(i, "freeType", "lifetime"); updateCode(i, "freeMonths", null); }}
                                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all"
                                            style={{
                                              background: c.freeType === "lifetime" ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.04)",
                                              color:      c.freeType === "lifetime" ? "#4ade80" : "#64748b",
                                              border:     `1px solid ${c.freeType === "lifetime" ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.08)"}`,
                                            }}>
                                            <InfinityIcon size={13} />
                                            Lifetime Free
                                          </button>
                                          {/* Limited months toggle */}
                                          <button onClick={() => { updateCode(i, "freeType", "months"); if (!c.freeMonths) updateCode(i, "freeMonths", 3); }}
                                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all"
                                            style={{
                                              background: c.freeType === "months" ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.04)",
                                              color:      c.freeType === "months" ? "#fbbf24" : "#64748b",
                                              border:     `1px solid ${c.freeType === "months" ? "rgba(251,191,36,0.28)" : "rgba(255,255,255,0.08)"}`,
                                            }}>
                                            <Calendar size={13} />
                                            Limited Months
                                          </button>
                                        </div>

                                        {/* Month count input — only when "months" selected */}
                                        {c.freeType === "months" && (
                                          <motion.div
                                            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                                            className="mt-3 flex items-center gap-3">
                                            <div className="flex-1 rounded-xl px-4 py-2.5 flex items-center gap-3"
                                              style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
                                              <Calendar size={13} style={{ color: "#fbbf24", flexShrink: 0 }} />
                                              <input
                                                type="number" min={1} max={120}
                                                value={c.freeMonths ?? 3}
                                                onChange={e => updateCode(i, "freeMonths", Math.max(1, Number(e.target.value)))}
                                                className="flex-1 bg-transparent text-sm font-bold outline-none"
                                                style={{ color: "#fbbf24" }} />
                                              <span className="text-xs" style={{ color: "#92400e", flexShrink: 0 }}>months free</span>
                                            </div>
                                            <p className="text-[10px] shrink-0" style={{ color: "#475569" }}>
                                              then billed normally
                                            </p>
                                          </motion.div>
                                        )}

                                        {c.freeType === "lifetime" && (
                                          <p className="text-[10px] mt-2.5 text-center" style={{ color: "#334155" }}>
                                            Server stays free permanently — no future billing
                                          </p>
                                        )}
                                      </div>
                                    )}

                                    {/* Row 4: Plan restriction */}
                                    <Field label="Apply to Plans">
                                      <PlanPicker value={c.plans}
                                        onChange={v => updateCode(i, "plans", v)} />
                                    </Field>

                                    {/* Row 5: Note + usage bar */}
                                    <div className="grid grid-cols-2 gap-3">
                                      <Field label="Internal Note (optional)">
                                        <input value={c.note} onChange={e => updateCode(i, "note", e.target.value)}
                                          placeholder="e.g. Given to @username for review"
                                          className="w-full bg-transparent text-xs outline-none italic" style={{ color: "#94a3b8" }} />
                                      </Field>
                                      <div className="rounded-xl px-4 py-3"
                                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                        <p className="text-[9px] mono uppercase tracking-widest mb-2" style={{ color: "#475569" }}>
                                          Usage
                                        </p>
                                        <p className="text-sm font-bold mono" style={{ color: exhausted ? "#f87171" : "#f1f5f9" }}>
                                          {c.usedCount}
                                          {c.maxUses > 0 && <span className="font-normal text-xs" style={{ color: "#475569" }}> / {c.maxUses}</span>}
                                        </p>
                                        {c.maxUses > 0 && (
                                          <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                                            <div className="h-full rounded-full transition-all duration-700"
                                              style={{ width: `${usedPct}%`, background: exhausted ? "#ef4444" : "#a855f7" }} />
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Delete */}
                                    <button onClick={() => removeCode(i)}
                                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all hover:opacity-80"
                                      style={{ color: "#f87171", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)" }}>
                                      <Trash2 size={12} /> Delete this code
                                    </button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                  {/* Save button */}
                  <div className="px-5 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <button onClick={() => saveSection("codes")} disabled={savingCodes}
                      className="w-full h-9 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{ background: "linear-gradient(135deg, #5b21b6, #7c3aed)", color: "white" }}>
                      {savingCodes ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                      {savedCodes ? "Saved!" : savingCodes ? "Saving…" : "Save Promo Codes"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl p-5 opacity-50 cursor-not-allowed"
                  style={{ background: "#0d0d18", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <p className="text-sm font-bold flex items-center gap-2" style={{ color: "#64748b" }}>
                    <Shield size={14} /> Promo Codes — No Access
                  </p>
                  <p className="text-xs mt-1" style={{ color: "#334155" }}>You don't have permission to manage promo codes.</p>
                </div>
              )}
            </div>

          </div>{/* end grid */}
        </motion.div>
      </div>
    </div>
  );
}
