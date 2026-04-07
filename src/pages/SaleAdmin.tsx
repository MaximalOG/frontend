import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Tag, Save, ToggleLeft, ToggleRight, RefreshCw, Plus, Trash2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAdminAuth } from "@/hooks/useAdminAuth";

const PLANS = ["Nano", "Basic", "Plus", "Starter", "Pro", "Elite", "Ultra", "Max", "Titan"];
const ease = [0.16, 1, 0.3, 1] as const;

interface PromoCode {
  name: string;
  code: string;
  discount: number;
  discountType: "percent" | "fixed";
  note: string;
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

const EMPTY_CODE: PromoCode = { name: "", code: "", discount: 20, discountType: "percent", note: "" };

const SaleAdmin = () => {
  const [config, setConfig] = useState<SaleConfig>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [savingBanner, setSavingBanner] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);
  const [savingCodes, setSavingCodes] = useState(false);
  const [savedCodes, setSavedCodes] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/sale`);
      const data = await res.json();
      setConfig({ ...DEFAULT, ...data, neverExpires: !data.endDate, codes: data.codes ?? [] });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const set = (key: keyof SaleConfig, value: any) =>
    setConfig(prev => ({ ...prev, [key]: value }));

  const togglePlan = (plan: string) => {
    if (config.plans === "all") set("plans", PLANS.filter(p => p !== plan));
    else {
      const arr = config.plans as string[];
      set("plans", arr.includes(plan) ? arr.filter(p => p !== plan) : [...arr, plan]);
    }
  };

  const addCode = () => set("codes", [...config.codes, { ...EMPTY_CODE }]);
  const removeCode = async (i: number) => {
    const updated = config.codes.filter((_, idx) => idx !== i);
    // Build the full payload with updated codes
    const payload = { ...config, codes: updated, endDate: config.neverExpires ? null : config.endDate };
    set("codes", updated);
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/admin/sale`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch { /* silent */ }
  };
  const updateCode = (i: number, field: keyof PromoCode, value: any) => {
    set("codes", config.codes.map((c, idx) =>
      idx === i ? { ...c, [field]: field === "code" ? String(value).toUpperCase() : value } : c
    ));
  };

  const { hasPermission } = useAdminAuth();
  const canBanner = hasPermission("banner_sale");
  const canCodes  = hasPermission("promo_codes");

  const isPlanSelected = (plan: string) =>
    config.plans === "all" || (config.plans as string[]).includes(plan);

  const saveSection = async (section: "banner" | "codes") => {
    const setSaving = section === "banner" ? setSavingBanner : setSavingCodes;
    const setSaved  = section === "banner" ? setSavedBanner  : setSavedCodes;
    setSaving(true);
    try {
      const payload = { ...config, endDate: config.neverExpires ? null : config.endDate };
      await fetch(`${import.meta.env.VITE_API_URL}/api/admin/sale`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />
      <div className="container mx-auto px-4 max-w-7xl pt-24">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <Tag className="w-6 h-6 text-primary" /> Sale Manager
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Control discounts and promo codes</p>
          </div>

          {/* Two sections side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* ── SECTION 1: BANNER SALE ── */}
          {canBanner ? (
          <div className="glass-surface rounded-sm p-5" style={{ border: "1px solid hsl(350 85% 25%)" }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: config.enabled ? "hsl(142 70% 55%)" : "hsl(0 0% 35%)" }} />
                  Public Banner Sale
                </h2>
                <p className="text-[10px] text-muted-foreground/50 mt-0.5">Shows a banner on every page. No code needed.</p>
              </div>
              <button
                onClick={() => set("enabled", !config.enabled)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-medium transition-all"
                style={{
                  background: config.enabled ? "hsl(142 60% 15%)" : "hsl(0 0% 10%)",
                  color: config.enabled ? "hsl(142 70% 55%)" : "hsl(0 0% 50%)",
                  border: `1px solid ${config.enabled ? "hsl(142 60% 25%)" : "hsl(0 0% 20%)"}`,
                }}
              >
                {config.enabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                {config.enabled ? "ON" : "OFF"}
              </button>
            </div>

            <div className="space-y-3">
              <Field label="Banner Label">
                <input value={config.label} onChange={e => set("label", e.target.value)}
                  placeholder="e.g. Launch Offer, Weekend Deal"
                  className="w-full bg-transparent text-sm text-foreground outline-none" />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Discount Amount">
                  <input type="number" min={1} max={100} value={config.discount}
                    onChange={e => set("discount", Number(e.target.value))}
                    className="w-full bg-transparent text-sm text-foreground outline-none" />
                </Field>
                <Field label="Type">
                  <select value={config.discountType} onChange={e => set("discountType", e.target.value)}
                    className="w-full bg-transparent text-sm text-foreground outline-none"
                    style={{ background: "hsl(0 0% 8%)" }}>
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </Field>
              </div>

              {/* Plans */}
              <div className="rounded-sm p-3" style={{ background: "hsl(0 0% 7%)", border: "1px solid hsl(0 0% 14%)" }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[9px] text-muted-foreground/50 mono uppercase tracking-wider">Apply to Plans</p>
                  <button onClick={() => set("plans", config.plans === "all" ? [] : "all")}
                    className="text-[10px] text-primary hover:brightness-125 transition-all">
                    {config.plans === "all" ? "Deselect all" : "Select all"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PLANS.map(plan => (
                    <button key={plan} onClick={() => togglePlan(plan)}
                      className="px-2 py-0.5 rounded-sm text-[11px] font-medium transition-all"
                      style={{
                        background: isPlanSelected(plan) ? "hsl(350 85% 15%)" : "hsl(0 0% 10%)",
                        color: isPlanSelected(plan) ? "hsl(350 85% 65%)" : "hsl(0 0% 45%)",
                        border: `1px solid ${isPlanSelected(plan) ? "hsl(350 85% 30%)" : "hsl(0 0% 18%)"}`,
                      }}>
                      {plan}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start Date (optional)">
                  <input type="datetime-local"
                    value={config.startDate ? config.startDate.slice(0, 16) : ""}
                    onChange={e => set("startDate", e.target.value ? new Date(e.target.value).toISOString() : null)}
                    className="w-full bg-transparent text-sm text-foreground outline-none"
                    style={{ colorScheme: "dark" }} />
                </Field>
                <Field label="End Date">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={config.neverExpires}
                        onChange={e => set("neverExpires", e.target.checked)} className="accent-primary" />
                      <span className="text-xs text-muted-foreground">Never expires</span>
                    </label>
                    {!config.neverExpires && (
                      <input type="datetime-local"
                        value={config.endDate ? config.endDate.slice(0, 16) : ""}
                        onChange={e => set("endDate", e.target.value ? new Date(e.target.value).toISOString() : null)}
                        className="w-full bg-transparent text-sm text-foreground outline-none"
                        style={{ colorScheme: "dark" }} />
                    )}
                  </div>
                </Field>
              </div>

              <Field label="Show Countdown Timer">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={config.showCountdown}
                    onChange={e => set("showCountdown", e.target.checked)} className="accent-primary" />
                  <span className="text-xs text-muted-foreground">Show countdown in banner (only if end date is set)</span>
                </label>
              </Field>

              <button onClick={() => saveSection("banner")} disabled={savingBanner}
                className="w-full h-9 rounded-sm text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: "hsl(350 85% 45%)", color: "white" }}>
                {savingBanner ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                {savedBanner ? "Saved!" : savingBanner ? "Saving…" : "Save Banner Settings"}
              </button>
            </div>
          </div>
          ) : (
            <div className="glass-surface rounded-sm p-5 mb-6 opacity-50 cursor-not-allowed" style={{ border: "1px solid hsl(0 0% 18%)" }}>
              <p className="text-sm font-bold text-muted-foreground flex items-center gap-2">🔒 Banner Sale — No Access</p>
              <p className="text-xs text-muted-foreground/50 mt-1">You don't have permission to manage the banner sale.</p>
            </div>
          )}

          {/* ── SECTION 2: PROMO CODES ── */}
          {canCodes ? (
          <div className="glass-surface rounded-sm p-5" style={{ border: "1px solid hsl(270 70% 30%)" }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-bold text-foreground">Promo Codes</h2>
                <p className="text-[10px] text-muted-foreground/50 mt-0.5">Secret codes for employees, creators, partners, etc.</p>
              </div>
              <button onClick={addCode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-all hover:brightness-110"
                style={{ background: "hsl(270 70% 15%)", color: "hsl(270 70% 65%)", border: "1px solid hsl(270 70% 30%)" }}>
                <Plus size={12} /> Add Code
              </button>
            </div>

            {config.codes.length === 0 ? (
              <p className="text-xs text-muted-foreground/40 text-center py-6">No codes yet. Click "Add Code" to create one.</p>
            ) : (
              <div className="space-y-3 mb-4">
                {config.codes.map((c, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-sm p-3 space-y-2"
                    style={{ background: "hsl(0 0% 7%)", border: "1px solid hsl(0 0% 14%)" }}>
                    <div className="flex items-center justify-between gap-2">
                      <input value={c.name} onChange={e => updateCode(i, "name", e.target.value)}
                        placeholder="Label (e.g. Employee, YouTuber, Partner)"
                        className="flex-1 bg-transparent text-xs text-foreground outline-none font-semibold"
                        style={{ borderBottom: "1px solid hsl(0 0% 18%)", paddingBottom: 2 }} />
                      <button onClick={() => removeCode(i)} className="text-muted-foreground/40 hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-[9px] text-muted-foreground/40 mb-1">Code</p>
                        <input value={c.code} onChange={e => updateCode(i, "code", e.target.value)}
                          placeholder="STAFF20"
                          className="w-full bg-transparent text-xs text-foreground outline-none mono tracking-widest" />
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground/40 mb-1">Discount</p>
                        <input type="number" min={1} max={100} value={c.discount}
                          onChange={e => updateCode(i, "discount", Number(e.target.value))}
                          className="w-full bg-transparent text-xs text-foreground outline-none" />
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground/40 mb-1">Type</p>
                        <select value={c.discountType} onChange={e => updateCode(i, "discountType", e.target.value)}
                          className="w-full bg-transparent text-xs text-foreground outline-none"
                          style={{ background: "hsl(0 0% 7%)" }}>
                          <option value="percent">%</option>
                          <option value="fixed">₹</option>
                        </select>
                      </div>
                    </div>
                    <input value={c.note} onChange={e => updateCode(i, "note", e.target.value)}
                      placeholder="Internal note (optional)"
                      className="w-full bg-transparent text-[10px] text-muted-foreground/50 outline-none italic" />
                  </motion.div>
                ))}
              </div>
            )}

            <button onClick={() => saveSection("codes")} disabled={savingCodes}
              className="w-full h-9 rounded-sm text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: "hsl(270 70% 40%)", color: "white" }}>
              {savingCodes ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
              {savedCodes ? "Saved!" : savingCodes ? "Saving…" : "Save Promo Codes"}
            </button>
          </div>
          ) : (
            <div className="glass-surface rounded-sm p-5 opacity-50 cursor-not-allowed" style={{ border: "1px solid hsl(0 0% 18%)" }}>
              <p className="text-sm font-bold text-muted-foreground flex items-center gap-2">🔒 Promo Codes — No Access</p>
              <p className="text-xs text-muted-foreground/50 mt-1">You don't have permission to manage promo codes.</p>
            </div>
          )}

          </div>{/* end grid */}

        </motion.div>
      </div>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="glass-surface rounded-sm px-4 py-3" style={{ border: "1px solid hsl(0 0% 16%)" }}>
    <p className="text-[9px] text-muted-foreground/50 mono uppercase tracking-wider mb-2">{label}</p>
    {children}
  </div>
);

export default SaleAdmin;
