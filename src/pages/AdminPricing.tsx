import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  DollarSign, Save, RotateCcw, ArrowLeft, Star, CheckCircle,
  AlertCircle, Loader2, Cpu, HardDrive, MemoryStick, RefreshCw,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";

const ease = [0.16, 1, 0.3, 1] as const;

interface PlanSpec {
  ram: string;   // e.g. "4GB"
  cpu: string;   // e.g. "200%"
  ssd: string;   // e.g. "25GB"
  priceInr: number;
  tier: string;
  popular?: boolean;
}

// Edits store plain numbers as strings — no units
interface PlanEdit {
  priceInr: string;  // "199"
  popular: boolean;
  ram: string;       // "4"
  cpu: string;       // "200"
  ssd: string;       // "25"
}

// Strip suffix from stored value for display in input
const stripGB  = (v: string) => v.replace(/GB$/i, "").trim();
const stripPct = (v: string) => v.replace(/%$/, "").trim();

const TIER_COLOR: Record<string, { text: string; bg: string; border: string }> = {
  Entry:     { text: "hsl(200 70% 60%)", bg: "hsl(200 70% 60% / 0.1)",  border: "hsl(200 70% 60% / 0.25)" },
  Community: { text: "hsl(262 95% 76%)", bg: "hsl(262 95% 76% / 0.1)",  border: "hsl(262 95% 76% / 0.25)" },
  Advanced:  { text: "hsl(142 70% 55%)", bg: "hsl(142 70% 55% / 0.1)",  border: "hsl(142 70% 55% / 0.25)" },
};

function PlanRow({
  name, spec, edit, onChange, onReset, changed,
}: {
  name: string;
  spec: PlanSpec;
  edit: PlanEdit;
  onChange: (field: keyof PlanEdit, value: string | boolean) => void;
  onReset: () => void;
  changed: boolean;
}) {
  const tier = TIER_COLOR[spec.tier] ?? { text: "hsl(0 0% 55%)", bg: "hsl(0 0% 55% / 0.08)", border: "hsl(0 0% 55% / 0.2)" };

  const inputCls = "w-full rounded-lg px-3 py-2 text-sm font-medium text-foreground bg-transparent outline-none mono transition-all";

  const isRamChanged = edit.ram  !== stripGB(spec.ram);
  const isCpuChanged = edit.cpu  !== stripPct(spec.cpu);
  const isSsdChanged = edit.ssd  !== stripGB(spec.ssd);
  const isPriceChanged = Number(edit.priceInr) !== spec.priceInr;

  const inputStyle = (isChanged: boolean) => ({
    border: `1px solid ${isChanged ? "hsl(262 95% 55%)" : "hsl(0 0% 20%)"}`,
    background: "hsl(254 22% 11%)",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-4 transition-all"
      style={{
        background: changed ? "hsl(262 95% 8%)" : "hsl(254 22% 11%)",
        border: `1px solid ${changed ? "hsl(262 95% 30%)" : "hsl(254 18% 18%)"}`,
      }}
    >
      {/* Plan header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 min-w-[90px]">
          <span className="text-sm font-bold text-foreground">{name}</span>
          {changed && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 animate-pulse" />}
        </div>

        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-semibold mono shrink-0"
          style={{ background: tier.bg, color: tier.text, border: `1px solid ${tier.border}` }}
        >
          {spec.tier}
        </span>

        <button
          onClick={() => onChange("popular", !edit.popular)}
          className="flex items-center gap-1 ml-auto text-[11px] transition-colors"
          style={{ color: edit.popular ? "hsl(262 95% 76%)" : "hsl(0 0% 35%)" }}
          title="Toggle popular badge"
        >
          <Star
            size={14}
            style={{
              fill:  edit.popular ? "hsl(262 95% 76%)" : "transparent",
              color: edit.popular ? "hsl(262 95% 76%)" : "hsl(0 0% 35%)",
              transition: "all 0.15s",
            }}
          />
          <span className="hidden sm:inline text-xs">Popular</span>
        </button>

        {changed && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          >
            <RotateCcw size={11} />
            <span className="hidden sm:inline">Reset</span>
          </button>
        )}
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

        {/* RAM */}
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-[10px] mono uppercase tracking-wider text-muted-foreground/50">
            <MemoryStick size={10} /> RAM
          </label>
          <div className="flex items-center rounded-lg overflow-hidden" style={inputStyle(isRamChanged)}>
            <input
              type="number" min={1} step={1}
              value={edit.ram}
              onChange={e => onChange("ram", e.target.value)}
              className={inputCls + " rounded-none border-0"}
              style={{ background: "transparent" }}
              onFocus={e => (e.currentTarget.parentElement!.style.borderColor = "hsl(262 95% 65%)")}
              onBlur={e  => (e.currentTarget.parentElement!.style.borderColor = isRamChanged ? "hsl(262 95% 55%)" : "hsl(0 0% 20%)")}
            />
            <span className="px-2 text-xs text-muted-foreground/50 mono shrink-0">GB</span>
          </div>
        </div>

        {/* CPU */}
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-[10px] mono uppercase tracking-wider text-muted-foreground/50">
            <Cpu size={10} /> CPU
          </label>
          <div className="flex items-center rounded-lg overflow-hidden" style={inputStyle(isCpuChanged)}>
            <input
              type="number" min={1} step={25}
              value={edit.cpu}
              onChange={e => onChange("cpu", e.target.value)}
              className={inputCls + " rounded-none border-0"}
              style={{ background: "transparent" }}
              onFocus={e => (e.currentTarget.parentElement!.style.borderColor = "hsl(262 95% 65%)")}
              onBlur={e  => (e.currentTarget.parentElement!.style.borderColor = isCpuChanged ? "hsl(262 95% 55%)" : "hsl(0 0% 20%)")}
            />
            <span className="px-2 text-xs text-muted-foreground/50 mono shrink-0">%</span>
          </div>
        </div>

        {/* SSD */}
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-[10px] mono uppercase tracking-wider text-muted-foreground/50">
            <HardDrive size={10} /> SSD
          </label>
          <div className="flex items-center rounded-lg overflow-hidden" style={inputStyle(isSsdChanged)}>
            <input
              type="number" min={1} step={1}
              value={edit.ssd}
              onChange={e => onChange("ssd", e.target.value)}
              className={inputCls + " rounded-none border-0"}
              style={{ background: "transparent" }}
              onFocus={e => (e.currentTarget.parentElement!.style.borderColor = "hsl(262 95% 65%)")}
              onBlur={e  => (e.currentTarget.parentElement!.style.borderColor = isSsdChanged ? "hsl(262 95% 55%)" : "hsl(0 0% 20%)")}
            />
            <span className="px-2 text-xs text-muted-foreground/50 mono shrink-0">GB</span>
          </div>
        </div>

        {/* Price */}
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-[10px] mono uppercase tracking-wider text-muted-foreground/50">
            <DollarSign size={10} /> Price ₹/mo
          </label>
          <div className="flex items-center rounded-lg overflow-hidden" style={inputStyle(isPriceChanged)}>
            <span className="pl-2 text-xs text-muted-foreground/50 mono shrink-0">₹</span>
            <input
              type="number" min={0} step={1}
              value={edit.priceInr}
              onChange={e => onChange("priceInr", e.target.value)}
              className={inputCls + " rounded-none border-0"}
              style={{ background: "transparent" }}
              onFocus={e => (e.currentTarget.parentElement!.style.borderColor = "hsl(262 95% 65%)")}
              onBlur={e  => (e.currentTarget.parentElement!.style.borderColor = isPriceChanged ? "hsl(262 95% 55%)" : "hsl(0 0% 20%)")}
            />
          </div>
        </div>

      </div>
    </motion.div>
  );
}

const AdminPricing = () => {
  const { user, loading, isOwner } = useAdminAuth();
  const navigate = useNavigate();

  const [plans, setPlans]               = useState<Record<string, PlanSpec>>({});
  const [edits, setEdits]               = useState<Record<string, PlanEdit>>({});
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [saving, setSaving]             = useState(false);
  const [saved, setSaved]               = useState(false);
  const [error, setError]               = useState("");

  useEffect(() => {
    if (!loading && !user) navigate("/admin/login");
    if (!loading && user && !isOwner) navigate("/admin");
  }, [loading, user, isOwner, navigate]);

  // Convert a PlanSpec to PlanEdit (strip suffixes)
  const specToEdit = (spec: PlanSpec): PlanEdit => ({
    priceInr: String(spec.priceInr),
    popular:  spec.popular ?? false,
    ram:      stripGB(spec.ram),
    cpu:      stripPct(spec.cpu),
    ssd:      stripGB(spec.ssd),
  });

  useEffect(() => {
    if (!isOwner) return;
    (async () => {
      setLoadingPlans(true);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/plans`, {
          headers: { "x-admin-token": localStorage.getItem("nn_admin_token") || "" },
        });
        const data: Record<string, PlanSpec> = await res.json();
        setPlans(data);
        const initial: Record<string, PlanEdit> = {};
        for (const [name, spec] of Object.entries(data)) {
          initial[name] = specToEdit(spec);
        }
        setEdits(initial);
      } catch {
        setError("Failed to load plan data. Check your connection.");
      } finally {
        setLoadingPlans(false);
      }
    })();
  }, [isOwner]);

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      const updates: Record<string, { priceInr: number; popular: boolean; ram: number; cpu: number; ssd: number }> = {};
      for (const [name, edit] of Object.entries(edits)) {
        const price = Number(edit.priceInr);
        const ram   = Number(edit.ram);
        const cpu   = Number(edit.cpu);
        const ssd   = Number(edit.ssd);
        if (isNaN(price) || price < 0) { setError(`Invalid price for ${name}`);    setSaving(false); return; }
        if (isNaN(ram)   || ram <= 0)  { setError(`Invalid RAM for ${name}`);      setSaving(false); return; }
        if (isNaN(cpu)   || cpu <= 0)  { setError(`Invalid CPU for ${name}`);      setSaving(false); return; }
        if (isNaN(ssd)   || ssd <= 0)  { setError(`Invalid SSD for ${name}`);      setSaving(false); return; }
        updates[name] = { priceInr: price, popular: edit.popular, ram, cpu, ssd };
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/plans`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": localStorage.getItem("nn_admin_token") || "",
        },
        body: JSON.stringify(updates),
      });
      const data: Record<string, PlanSpec> = await res.json();
      if (!res.ok) { setError((data as any).error || "Save failed."); return; }

      setPlans(data);
      const refreshed: Record<string, PlanEdit> = {};
      for (const [name, spec] of Object.entries(data)) {
        refreshed[name] = specToEdit(spec);
      }
      setEdits(refreshed);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Network error. Is the backend running?");
    } finally {
      setSaving(false);
    }
  };

  const resetPlan = (name: string) => {
    const p = plans[name];
    if (!p) return;
    setEdits(prev => ({ ...prev, [name]: specToEdit(p) }));
  };

  const setField = (name: string, field: keyof PlanEdit, value: string | boolean) => {
    setEdits(prev => ({ ...prev, [name]: { ...prev[name], [field]: value } }));
  };

  const hasChanges = Object.entries(edits).some(([name, edit]) => {
    const p = plans[name];
    if (!p) return false;
    return (
      Number(edit.priceInr) !== p.priceInr ||
      edit.popular !== (p.popular ?? false) ||
      edit.ram !== stripGB(p.ram) ||
      edit.cpu !== stripPct(p.cpu) ||
      edit.ssd !== stripGB(p.ssd)
    );
  });

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 max-w-3xl pt-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>

          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <Link to="/admin" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={13} /> Admin
            </Link>
            <span className="text-muted-foreground/30 text-xs">/</span>
            <span className="text-xs text-muted-foreground">Plan Pricing &amp; Specs</span>
          </div>

          <div className="flex items-start justify-between mb-6 mt-4 flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "hsl(262 95% 15%)", border: "1px solid hsl(262 95% 30%)" }}>
                  <DollarSign size={16} className="text-primary" />
                </div>
                Plan Editor
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Enter numbers only — units are added automatically. Changes apply instantly.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {saved && (
                <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1.5 text-xs text-green-400">
                  <CheckCircle size={12} /> Saved
                </motion.span>
              )}
              <button onClick={handleSave} disabled={saving || !hasChanges}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-40"
                style={{ background: "hsl(262 95% 55%)", color: "white" }}>
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 flex-wrap px-4 py-3 rounded-xl mb-6 text-[11px] text-muted-foreground/60"
            style={{ background: "hsl(254 22% 11%)", border: "1px solid hsl(254 18% 18%)" }}>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Changed field
            </span>
            <span className="flex items-center gap-1.5">
              <Star size={11} className="text-primary" /> Popular badge on pricing page
            </span>
            <span>Set price to <strong className="text-foreground">0</strong> to make free</span>
            <span className="mono">RAM/SSD in GB · CPU in %</span>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl px-4 py-3 mb-5 text-sm flex items-center gap-2"
              style={{ background: "hsl(0 84% 8%)", border: "1px solid hsl(0 84% 25%)", color: "hsl(0 84% 70%)" }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* Plan rows */}
          {loadingPlans ? (
            <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading plans…</span>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(plans).map(([name, spec], i) => {
                const edit = edits[name] ?? specToEdit(spec);
                const changed =
                  Number(edit.priceInr) !== spec.priceInr ||
                  edit.popular !== (spec.popular ?? false) ||
                  edit.ram !== stripGB(spec.ram) ||
                  edit.cpu !== stripPct(spec.cpu) ||
                  edit.ssd !== stripGB(spec.ssd);

                return (
                  <motion.div key={name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3, ease }}>
                    <PlanRow
                      name={name} spec={spec} edit={edit} changed={changed}
                      onChange={(field, value) => setField(name, field, value)}
                      onReset={() => resetPlan(name)}
                    />
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Save footer */}
          {hasChanges && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex items-center justify-between rounded-xl px-5 py-4 flex-wrap gap-3"
              style={{ background: "hsl(262 95% 8%)", border: "1px solid hsl(262 95% 28%)" }}>
              <p className="text-sm text-muted-foreground">Unsaved changes — won't go live until saved.</p>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-50"
                style={{ background: "hsl(262 95% 55%)", color: "white" }}>
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {saving ? "Saving…" : "Save All Changes"}
              </button>
            </motion.div>
          )}

        </motion.div>
      </div>
    </div>
  );
};

export default AdminPricing;
