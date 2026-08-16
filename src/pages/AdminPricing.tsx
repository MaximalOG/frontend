import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DollarSign, Save, RotateCcw, ArrowLeft, Star, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
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

const TIER_COLOR: Record<string, string> = {
  Entry:     "hsl(200 70% 55%)",
  Community: "hsl(270 70% 60%)",
  Advanced:  "hsl(350 85% 60%)",
};

const AdminPricing = () => {
  const { user, loading, isOwner } = useAdminAuth();
  const navigate = useNavigate();

  const [plans, setPlans]     = useState<Record<string, PlanSpec>>({});
  const [edits, setEdits]     = useState<Record<string, { priceInr: string; popular: boolean }>>({});
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");

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
        // Init edits from current values
        const initial: Record<string, { priceInr: string; popular: boolean }> = {};
        for (const [name, spec] of Object.entries(data)) {
          initial[name] = { priceInr: String(spec.priceInr), popular: spec.popular ?? false };
        }
        setEdits(initial);
      } catch { setError("Failed to load plan prices."); }
      finally { setLoadingPlans(false); }
    })();
  }, [isOwner]);

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      // Build only the changed fields
      const updates: Record<string, { priceInr: number; popular: boolean }> = {};
      for (const [name, edit] of Object.entries(edits)) {
        const price = Number(edit.priceInr);
        if (isNaN(price) || price < 0) { setError(`Invalid price for ${name}`); return; }
        updates[name] = { priceInr: price, popular: edit.popular };
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
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { setError("Network error."); }
    finally { setSaving(false); }
  };

  const resetPlan = (name: string) => {
    setEdits(prev => ({ ...prev, [name]: { priceInr: String(plans[name]?.priceInr ?? 0), popular: plans[name]?.popular ?? false } }));
  };

  const hasChanges = Object.entries(edits).some(([name, edit]) =>
    Number(edit.priceInr) !== plans[name]?.priceInr ||
    edit.popular !== (plans[name]?.popular ?? false)
  );

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="container mx-auto px-4 max-w-3xl pt-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>

          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link to="/admin" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={13} /> Admin
            </Link>
            <span className="text-muted-foreground/30">/</span>
            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-primary" />
              <h1 className="text-xl font-bold text-foreground tracking-tight">Plan Pricing</h1>
              <span className="px-2 py-0.5 rounded-sm text-[9px] mono uppercase font-semibold"
                style={{ background: "hsl(350 85% 15%)", color: "hsl(350 85% 65%)", border: "1px solid hsl(350 85% 30%)" }}>
                Owner Only
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {saved && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-xs text-green-400">
                  <CheckCircle size={12} /> Saved
                </motion.span>
              )}
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-semibold transition-all hover:brightness-110 disabled:opacity-40"
                style={{ background: "hsl(350 85% 45%)", color: "white" }}
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                {saving ? "Saving…" : "Save All Changes"}
              </button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mb-6">
            Changes take effect immediately — no restart required. Set a price to <strong className="text-foreground">0</strong> to make a plan free.
            The <Star size={10} className="inline text-yellow-400 mx-0.5" /> popular badge highlights a plan on the pricing page.
          </p>

          {error && (
            <div className="rounded-sm px-4 py-3 mb-5 text-xs flex items-center gap-2"
              style={{ background: "hsl(350 85% 8%)", border: "1px solid hsl(350 85% 25%)", color: "hsl(350 85% 65%)" }}>
              <AlertCircle size={13} /> {error}
            </div>
          )}

          {loadingPlans ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-2">
              {/* Column headers */}
              <div className="grid grid-cols-12 px-4 py-2 text-[9px] mono uppercase tracking-wider text-muted-foreground/40">
                <span className="col-span-3">Plan</span>
                <span className="col-span-3">Specs</span>
                <span className="col-span-2">Tier</span>
                <span className="col-span-3">Price (₹/mo)</span>
                <span className="col-span-1 text-center">Popular</span>
              </div>

              {Object.entries(plans).map(([name, spec], i) => {
                const edit = edits[name] ?? { priceInr: String(spec.priceInr), popular: spec.popular ?? false };
                const changed = Number(edit.priceInr) !== spec.priceInr || edit.popular !== (spec.popular ?? false);
                const tierColor = TIER_COLOR[spec.tier] ?? "hsl(0 0% 50%)";

                return (
                  <motion.div
                    key={name}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3, ease }}
                    className="grid grid-cols-12 px-4 py-3.5 rounded-sm items-center gap-2"
                    style={{
                      background: changed ? "hsl(350 85% 5%)" : "hsl(0 0% 6%)",
                      border: `1px solid ${changed ? "hsl(350 85% 25%)" : "hsl(0 0% 14%)"}`,
                      transition: "background 0.2s, border-color 0.2s",
                    }}
                  >
                    {/* Plan name */}
                    <div className="col-span-3 flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{name}</span>
                      {changed && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"
                        />
                      )}
                    </div>

                    {/* Specs */}
                    <div className="col-span-3 text-[10px] text-muted-foreground/50 mono leading-relaxed">
                      <div>{spec.ram} RAM</div>
                      <div>{spec.ssd} SSD</div>
                    </div>

                    {/* Tier */}
                    <div className="col-span-2">
                      <span className="px-2 py-0.5 rounded-sm text-[9px] font-semibold mono"
                        style={{ background: `${tierColor}18`, color: tierColor, border: `1px solid ${tierColor}35` }}>
                        {spec.tier}
                      </span>
                    </div>

                    {/* Price input */}
                    <div className="col-span-3 flex items-center gap-1.5">
                      <span className="text-muted-foreground/40 text-sm">₹</span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={edit.priceInr}
                        onChange={e => setEdits(prev => ({ ...prev, [name]: { ...prev[name], priceInr: e.target.value } }))}
                        className="w-full rounded-sm px-2.5 py-1.5 text-sm font-bold text-foreground bg-transparent outline-none mono"
                        style={{
                          border: `1px solid ${changed ? "hsl(350 85% 35%)" : "hsl(0 0% 20%)"}`,
                          background: "hsl(0 0% 8%)",
                        }}
                        onFocus={e => (e.currentTarget.style.borderColor = "hsl(350 85% 45%)")}
                        onBlur={e => (e.currentTarget.style.borderColor = changed ? "hsl(350 85% 35%)" : "hsl(0 0% 20%)")}
                      />
                      {changed && (
                        <button onClick={() => resetPlan(name)}
                          title="Reset to saved value"
                          className="text-muted-foreground/30 hover:text-muted-foreground transition-colors shrink-0">
                          <RotateCcw size={12} />
                        </button>
                      )}
                    </div>

                    {/* Popular toggle */}
                    <div className="col-span-1 flex justify-center">
                      <button
                        onClick={() => setEdits(prev => ({ ...prev, [name]: { ...prev[name], popular: !prev[name]?.popular } }))}
                        title="Toggle popular badge"
                        className="transition-all hover:scale-110"
                      >
                        <Star
                          size={16}
                          className="transition-colors"
                          style={{
                            color: edit.popular ? "hsl(38 90% 58%)" : "hsl(0 0% 25%)",
                            fill: edit.popular ? "hsl(38 90% 58%)" : "transparent",
                          }}
                        />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Save footer */}
          {hasChanges && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex items-center justify-between rounded-sm px-5 py-3.5"
              style={{ background: "hsl(350 85% 8%)", border: "1px solid hsl(350 85% 25%)" }}
            >
              <p className="text-xs text-muted-foreground">
                You have unsaved changes. They won't take effect until you save.
              </p>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-sm text-xs font-semibold transition-all hover:brightness-110 disabled:opacity-50"
                style={{ background: "hsl(350 85% 45%)", color: "white" }}
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AdminPricing;
