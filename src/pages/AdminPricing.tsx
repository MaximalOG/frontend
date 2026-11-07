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
  ram: string;
  cpu: string;
  ssd: string;
  priceInr: number;
  tier: string;
  popular?: boolean;
}

interface PlanEdit {
  priceInr: string;
  popular: boolean;
  ram: string;
  cpu: string;
  ssd: string;
}

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
  const inputBase = (isChanged: boolean) => ({
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
      {/* Plan header row */}
      <div className="flex items-center gap-3 mb-4">
        {/* Name */}
        <div className="flex items-center gap-2 min-w-[90px]">
          <span className="text-sm font-bold text-foreground">{name}</span>
          {changed && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 animate-pulse" />
          )}
        </div>

        {/* Tier badge */}
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-semibold mono shrink-0"
          style={{ background: tier.bg, color: tier.text, border: `1px solid ${tier.border}` }}
        >
          {spec.tier}
        </span>

        {/* Popular toggle */}
        <button
          onClick={() => onChange("popular", !edit.popular)}
          className="flex items-center gap-1 ml-auto text-[11px] transition-colors"
          style={{ color: edit.popular ? "hsl(262 95% 76%)" : "hsl(0 0% 35%)" }}
          title="Toggle popular badge"
        >
          <Star
            size={14}
            style={{
              fill: edit.popular ? "hsl(262 95% 76%)" : "transparent",
              color: edit.popular ? "hsl(262 95% 76%)" : "hsl(0 0% 35%)",
              transition: "all 0.15s",
            }}
          />
          <span className="hidden sm:inline text-xs">Popular</span>
        </button>

        {/* Reset */}
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

      {/* 4-column input grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* RAM */}
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-[10px] mono uppercase tracking-wider text-muted-foreground/50">
            <MemoryStick size={10} /> RAM
          </label>
          <input
            type="text"
            value={edit.ram}
            placeholder="4GB"
            onChange={e => onChange("ram", e.target.value)}
            className={inputCls}
            style={inputBase(edit.ram !== spec.ram)}
            onFocus={e => (e.currentTarget.style.borderColor = "hsl(262 95% 65%)")}
            onBlur={e => (e.currentTarget.style.borderColor = edit.ram !== spec.ram ? "hsl(262 95% 55%)" : "hsl(0 0% 20%)")}
          />
        </div>

        {/* CPU */}
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-[10px] mono uppercase tracking-wider text-muted-foreground/50">
            <Cpu size={10} /> CPU
          </label>
          <input
            type="text"
            value={edit.cpu}
            placeholder="200%"
            onChange={e => onChange("cpu", e.target.value)}
            className={inputCls}
            style={inputBase(edit.cpu !== spec.cpu)}
            onFocus={e => (e.currentTarget.style.borderColor = "hsl(262 95% 65%)")}
            onBlur={e => (e.currentTarget.style.borderColor = edit.cpu !== spec.cpu ? "hsl(262 95% 55%)" : "hsl(0 0% 20%)")}
          />
        </div>

        {/* SSD */}
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-[10px] mono uppercase tracking-wider text-muted-foreground/50">
            <HardDrive size={10} /> SSD
          </label>
          <input
            type="text"
            value={edit.ssd}
            placeholder="25GB"
            onChange={e => onChange("ssd", e.target.value)}
            className={inputCls}
            style={inputBase(edit.ssd !== spec.ssd)}
            onFocus={e => (e.currentTarget.style.borderColor = "hsl(262 95% 65%)")}
            onBlur={e => (e.currentTarget.style.borderColor = edit.ssd !== spec.ssd ? "hsl(262 95% 55%)" : "hsl(0 0% 20%)")}
          />
        </div>

        {/* Price */}
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-[10px] mono uppercase tracking-wider text-muted-foreground/50">
            <DollarSign size={10} /> Price ₹/mo
          </label>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground/40 text-sm shrink-0">₹</span>
            <input
              type="number"
              min={0}
              step={1}
              value={edit.priceInr}
              onChange={e => onChange("priceInr", e.target.value)}
              className={inputCls}
              style={inputBase(Number(edit.priceInr) !== spec.priceInr)}
              onFocus={e => (e.currentTarget.style.borderColor = "hsl(262 95% 65%)")}
              onBlur={e => (e.currentTarget.style.borderColor = Number(edit.priceInr) !== spec.priceInr ? "hsl(262 95% 55%)" : "hsl(0 0% 20%)")}
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

  const [plans, setPlans]           = useState<Record<string, PlanSpec>>({});
  const [edits, setEdits]           = useState<Record<string, PlanEdit>>({});
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [error, setError]           = useState("");

  useEffect(() => {
    if (!loading && !user) navigate("/admin/login");
    if (!loading && user && !isOwner) navigate("/admin");
  }, [loading, user, isOwner, navigate]);

  useEffect(() => {
    if (!isOwner) return;
    (async () => {
      setLoadingPlans(true);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/plans`, {
          headers: { "x-admin-token": localStorage.getItem("nn_admin_token") || "" },
        });
        const data = await res.json();
        setPlans(data);
        const initial: Record<string, PlanEdit> = {};
        for (const [name, spec] of Object.entries(data)) {
          initial[name] = {
            priceInr: String(spec.priceInr),
            popular: spec.popular ?? false,
            ram: spec.ram,
            cpu: spec.cpu,
            ssd: spec.ssd,
          };
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
      const updates: Record<string, { priceInr: number; popular: boolean; ram: string; cpu: string; ssd: string }> = {};
      for (const [name, edit] of Object.entries(edits)) {
        const price = Number(edit.priceInr);
        if (isNaN(price) || price < 0) { setError(`Invalid price for ${name}`); setSaving(false); return; }
        if (!edit.ram.trim())          { setError(`RAM is empty for ${name}`);   setSaving(false); return; }
        if (!edit.cpu.trim())          { setError(`CPU is empty for ${name}`);   setSaving(false); return; }
        if (!edit.ssd.trim())          { setError(`SSD is empty for ${name}`);   setSaving(false); return; }
        updates[name] = {
          priceInr: price,
          popular:  edit.popular,
          ram:      edit.ram.trim(),
          cpu:      edit.cpu.trim(),
          ssd:      edit.ssd.trim(),
        };
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/plans`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": localStorage.getItem("nn_admin_token") || "",
        },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Save failed."); return; }
      setPlans(data);
      // Refresh edits from saved data
      const refreshed: Record<string, PlanEdit> = {};
      for (const [name, spec] of Object.entries(data as Record<string, PlanSpec>)) {
        refreshed[name] = {
          priceInr: String(spec.priceInr),
          popular: spec.popular ?? false,
          ram: spec.ram,
          cpu: spec.cpu,
          ssd: spec.ssd,
        };
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
    setEdits(prev => ({
      ...prev,
      [name]: { priceInr: String(p.priceInr), popular: p.popular ?? false, ram: p.ram, cpu: p.cpu, ssd: p.ssd },
    }));
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
      edit.ram !== p.ram ||
      edit.cpu !== p.cpu ||
      edit.ssd !== p.ssd
    );
  });

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 max-w-3xl pt-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>

          {/* ── Header ── */}
          <div className="flex items-center gap-3 mb-2">
            <Link
              to="/admin"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={13} /> Admin
            </Link>
            <span className="text-muted-foreground/30 text-xs">/</span>
            <span className="text-xs text-muted-foreground">Plan Pricing &amp; Specs</span>
          </div>

          <div className="flex items-start justify-between mb-6 mt-4 flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "hsl(262 95% 15%)", border: "1px solid hsl(262 95% 30%)" }}
                >
                  <DollarSign size={16} className="text-primary" />
                </div>
                Plan Editor
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Edit RAM, CPU, SSD and price per plan. Changes apply instantly — no restart needed.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {saved && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1.5 text-xs text-green-400"
                >
                  <CheckCircle size={12} /> Saved
                </motion.span>
              )}
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-40"
                style={{ background: "hsl(262 95% 55%)", color: "white" }}
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>

          {/* ── Key */}
          <div
            className="flex items-center gap-6 flex-wrap px-4 py-3 rounded-xl mb-6 text-[11px] text-muted-foreground/60"
            style={{ background: "hsl(254 22% 11%)", border: "1px solid hsl(254 18% 18%)" }}
          >
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Changed field
            </span>
            <span className="flex items-center gap-1.5">
              <Star size={11} className="text-primary" /> Popular badge on pricing page
            </span>
            <span>Set price to <strong className="text-foreground">0</strong> to make free</span>
          </div>

          {/* ── Error ── */}
          {error && (
            <div
              className="rounded-xl px-4 py-3 mb-5 text-sm flex items-center gap-2"
              style={{ background: "hsl(0 84% 8%)", border: "1px solid hsl(0 84% 25%)", color: "hsl(0 84% 70%)" }}
            >
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* ── Plan rows ── */}
          {loadingPlans ? (
            <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading plans…</span>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(plans).map(([name, spec], i) => {
                const edit = edits[name] ?? {
                  priceInr: String(spec.priceInr),
                  popular: spec.popular ?? false,
                  ram: spec.ram,
                  cpu: spec.cpu,
                  ssd: spec.ssd,
                };
                const changed =
                  Number(edit.priceInr) !== spec.priceInr ||
                  edit.popular !== (spec.popular ?? false) ||
                  edit.ram !== spec.ram ||
                  edit.cpu !== spec.cpu ||
                  edit.ssd !== spec.ssd;

                return (
                  <motion.div
                    key={name}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3, ease }}
                  >
                    <PlanRow
                      name={name}
                      spec={spec}
                      edit={edit}
                      changed={changed}
                      onChange={(field, value) => setField(name, field, value)}
                      onReset={() => resetPlan(name)}
                    />
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* ── Sticky save footer ── */}
          {hasChanges && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex items-center justify-between rounded-xl px-5 py-4 flex-wrap gap-3"
              style={{ background: "hsl(262 95% 8%)", border: "1px solid hsl(262 95% 28%)" }}
            >
              <p className="text-sm text-muted-foreground">
                You have unsaved changes — they won't go live until saved.
              </p>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-50"
                style={{ background: "hsl(262 95% 55%)", color: "white" }}
              >
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
