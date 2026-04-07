import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Rocket, Cpu, HardDrive, MemoryStick, Users, Globe, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import PromoCode, { type DiscountInfo } from "./PromoCode";
import CurrencySelector from "./CurrencySelector";
import CheckoutButton from "./CheckoutButton";
import { useCurrency } from "@/hooks/useCurrency";

// Smart Plan Selector — 4-step logic
const STEPS = [
  {
    id: "players",
    title: "How many players are you planning?",
    options: ["1–5", "5–10", "10–20", "20–40", "40+"],
  },
  {
    id: "type",
    title: "What are you using?",
    options: ["Vanilla", "Plugins (Paper/Spigot)", "Mods / Modpack"],
  },
  {
    id: "load",
    title: "How heavy is your setup?",
    options: ["Light (few plugins/mods)", "Medium (10–20 plugins/mods)", "Heavy (20+ plugins or large modpacks)"],
  },
  {
    id: "activity",
    title: "How active will the server be?",
    options: ["Casual", "Moderate", "Very Active"],
  },
] as const;

type Answers = { players?: string; type?: string; load?: string; activity?: string };

function calcPlan(a: Answers): string {
  // Step 1: base RAM from player count (GB)
  let ram = 2;
  if (a.players === "1–5")   ram = 2;
  if (a.players === "5–10")  ram = 3;
  if (a.players === "10–20") ram = 4;
  if (a.players === "20–40") ram = 6;
  if (a.players === "40+")   ram = 10;

  // Step 2: server type
  if (a.type === "Plugins (Paper/Spigot)") ram += 2;
  if (a.type === "Mods / Modpack")         ram += 4;

  // Step 3: load level
  if (a.load?.startsWith("Medium")) ram += 1;
  if (a.load?.startsWith("Heavy"))  ram += 3;

  // Step 4: activity
  if (a.activity === "Moderate")    ram += 1;
  if (a.activity === "Very Active") ram += 2;

  // Safety floors
  if (a.players === "20–40" && ram < 6)  ram = 6;
  if (a.players === "40+"   && ram < 8)  ram = 8;

  // Round up to nearest available plan
  const tiers = [1, 2, 3, 4, 6, 8, 10, 12, 16];
  const names  = ["Nano", "Basic", "Plus", "Starter", "Pro", "Elite", "Ultra", "Max", "Titan"];
  const idx = tiers.findIndex((t) => t >= ram);
  return names[idx === -1 ? names.length - 1 : idx];
}

const CORE_FEATURES = [
  "Full Panel Access",
  "DDoS Protection",
  "Instant Setup",
  "Reliable Uptime",
];

type TierKey = 1 | 2 | 3;

const TIER_INFO: Record<TierKey, {
  label: string;
  badge: string | null;
  hardware: string;
  hook: string;
  features: { icon: string; label: string; value: string }[];
}> = {
  1: {
    label: "Entry / Testing",
    badge: null,
    hardware: "Powered by enterprise-grade CPUs",
    hook: "Get your own branded server address instantly",
    features: [
      { icon: "🛡️", label: "DDoS Protection", value: "Standard (L4/L7)" },
      { icon: "💾", label: "Backups", value: "Manual only" },
      { icon: "🗄️", label: "Databases", value: "1 MySQL" },
      { icon: "🖥️", label: "Panel", value: "Standard Pterodactyl" },
      { icon: "📦", label: "Mod Installer", value: "Manual setup" },
      { icon: "🌐", label: "Subdomain", value: "yourserver.nethernodes.in (shared IP)" },
      { icon: "🎫", label: "Support", value: "Ticket (24h)" },
      { icon: "📦", label: "Migration", value: "Self-service" },
    ],
  },
  2: {
    label: "Community / SMP / Modded",
    badge: "Most Popular Tier",
    hardware: "High-performance Ryzen-powered nodes",
    hook: "Get your own branded server address instantly",
    features: [
      { icon: "🛡️", label: "DDoS Protection", value: "Advanced Shield" },
      { icon: "💾", label: "Backups", value: "3 daily slots" },
      { icon: "🗄️", label: "Databases", value: "3 MySQL" },
      { icon: "🖥️", label: "Panel", value: "Custom NetherNodes Panel" },
      { icon: "📦", label: "Mod Installer", value: "1-click (6000+ packs)" },
      { icon: "🌐", label: "Subdomain", value: "yourserver.nethernodes.in (optimized routing)" },
      { icon: "⚡", label: "Support", value: "Priority (4h)" },
      { icon: "🚚", label: "Migration", value: "Assisted" },
    ],
  },
  3: {
    label: "Advanced / Networks / Heavy",
    badge: "Best Performance",
    hardware: "Powered by Ryzen 9-class performance",
    hook: "Dedicated IP (No Port Required) — Get your own branded server address instantly",
    features: [
      { icon: "🛡️", label: "DDoS Protection", value: "Enterprise (Anycast)" },
      { icon: "💾", label: "Backups", value: "Unlimited + off-site" },
      { icon: "🗄️", label: "Databases", value: "Unlimited MySQL" },
      { icon: "🖥️", label: "Panel", value: "Custom + priority access" },
      { icon: "📦", label: "Mod Installer", value: "1-click + expert assist" },
      { icon: "🌐", label: "Subdomain", value: "yourserver.nethernodes.in + dedicated IP (connect without :port)" },
      { icon: "💬", label: "Support", value: "Instant Discord / live chat" },
      { icon: "🚚", label: "Migration", value: "Full white-glove transfer" },
    ],
  },
};

const PLAN_TIER: Record<string, TierKey> = {
  Nano: 1, Basic: 1, Plus: 1,
  Starter: 2, Pro: 2, Elite: 2,
  Ultra: 3, Max: 3, Titan: 3,
};

const plans = [
  {
    name: "Nano",    price: "₹69",    priceInr: 69,    priceNote: "/month",
    description: "Testing and development servers",    shortLine: "Testing / development",
    btnLabel: "Start Nano Server",
    specs: { ram: "1GB RAM", ssd: "5GB SSD", cpu: "50% CPU" },
    infoRow: { players: "1–2 players", plugins: "No modded", type: "Testing / dev" },
    usageLines: ["1–2 players (vanilla/light)", "Not for modded", "Testing / development"],
    perfWidth: "40%", popular: false, popularLabel: null,
    features: ["Full Panel Access", "DDoS Protection", "Instant Setup", "Daily Backups"],
  },
  {
    name: "Basic",   price: "Free",   priceInr: 0,     priceNote: "limited time",
    description: "Small vanilla server for friends",   shortLine: "Small vanilla friends server",
    btnLabel: "Start Free Server",
    specs: { ram: "2GB RAM", ssd: "10GB SSD", cpu: "100% CPU" },
    infoRow: { players: "1–5 players", plugins: "No modded", type: "Vanilla / Survival" },
    usageLines: ["1–5 players", "Not for modded", "Small vanilla friends server"],
    perfWidth: "50%", popular: false, popularLabel: null,
    features: ["Full Panel Access", "DDoS Protection", "Instant Setup", "Daily Backups"],
  },
  {
    name: "Plus",    price: "₹129",   priceInr: 129,   priceNote: "/month",
    description: "Light SMP for small groups",         shortLine: "Light SMP",
    btnLabel: "Start Plus Server",
    specs: { ram: "3GB RAM", ssd: "15GB SSD", cpu: "150% CPU" },
    infoRow: { players: "5–10 players", plugins: "No modded", type: "Light SMP" },
    usageLines: ["5–10 players", "Not for modded", "Light SMP"],
    perfWidth: "60%", popular: false, popularLabel: null,
    features: ["Full Panel Access", "DDoS Protection", "Instant Setup", "Daily Backups"],
  },
  {
    name: "Starter", price: "₹199",   priceInr: 199,   priceNote: "/month",
    description: "Small plugin server with light modded support", shortLine: "Small plugin server",
    btnLabel: "Start Starter Server",
    specs: { ram: "4GB RAM", ssd: "25GB SSD", cpu: "200% CPU" },
    infoRow: { players: "10–15 players", plugins: "1–3 modded", type: "Plugin server" },
    usageLines: ["10–15 players (vanilla/plugins)", "1–3 modded", "Small plugin server"],
    perfWidth: "70%", popular: true, popularLabel: "Most Chosen",
    features: ["Full Panel Access", "DDoS Protection", "Instant Setup", "Daily Backups"],
  },
  {
    name: "Pro",     price: "₹329",   priceInr: 329,   priceNote: "/month",
    description: "Modded co-op with solid plugin support", shortLine: "Modded co-op",
    btnLabel: "Start Pro Server",
    specs: { ram: "6GB RAM", ssd: "40GB SSD", cpu: "250% CPU" },
    infoRow: { players: "15–20 players", plugins: "3–8 modded", type: "Modded co-op" },
    usageLines: ["15–20 players", "3–8 modded", "Modded co-op"],
    perfWidth: "80%", popular: false, popularLabel: null,
    features: ["Full Panel Access", "DDoS Protection", "Instant Setup", "Daily Backups"],
  },
  {
    name: "Elite",   price: "₹469",   priceInr: 469,   priceNote: "/month",
    description: "Small modded community server",      shortLine: "Small modded community",
    btnLabel: "Start Elite Server",
    specs: { ram: "8GB RAM", ssd: "60GB SSD", cpu: "300% CPU" },
    infoRow: { players: "20–30 players", plugins: "8–12 modded", type: "Modded community" },
    usageLines: ["20–30 players", "8–12 modded", "Small modded community"],
    perfWidth: "85%", popular: false, popularLabel: null,
    features: ["Full Panel Access", "DDoS Protection", "Instant Setup", "Daily Backups"],
  },
  {
    name: "Ultra",   price: "₹649",   priceInr: 649,   priceNote: "/month",
    description: "Heavy modpacks with large player counts", shortLine: "Heavy modpacks",
    btnLabel: "Start Ultra Server",
    specs: { ram: "10GB RAM", ssd: "80GB SSD", cpu: "350% CPU" },
    infoRow: { players: "30–45 players", plugins: "12–20 modded", type: "Heavy modpacks" },
    usageLines: ["30–45 players", "12–20 modded", "Heavy modpacks"],
    perfWidth: "90%", popular: false, popularLabel: null,
    features: ["Full Panel Access", "DDoS Protection", "Instant Setup", "Daily Backups"],
  },
  {
    name: "Max",     price: "₹829",   priceInr: 829,   priceNote: "/month",
    description: "Large modded SMP with high player capacity", shortLine: "Large modded SMP",
    btnLabel: "Start Max Server",
    specs: { ram: "12GB RAM", ssd: "100GB SSD", cpu: "400% CPU" },
    infoRow: { players: "45–60 players", plugins: "20–30 modded", type: "Large modded SMP" },
    usageLines: ["45–60 players", "20–30 modded", "Large modded SMP"],
    perfWidth: "95%", popular: false, popularLabel: null,
    features: ["Full Panel Access", "DDoS Protection", "Instant Setup", "Daily Backups"],
  },
  {
    name: "Titan",   price: "₹1,099", priceInr: 1099,  priceNote: "/month",
    description: "Networks and large modpack servers", shortLine: "Networks / large modpacks",
    btnLabel: "Start Titan Server",
    specs: { ram: "16GB RAM", ssd: "140GB SSD", cpu: "450% CPU" },
    infoRow: { players: "60–100+ players", plugins: "30–50 modded", type: "Network / large modpacks" },
    usageLines: ["60–100+ players", "30–50 modded", "Networks / large modpacks"],
    perfWidth: "100%", popular: false, popularLabel: null,
    features: ["Full Panel Access", "DDoS Protection", "Instant Setup", "Daily Backups"],
  },
];

const ease = [0.16, 1, 0.3, 1] as const;

const PricingSection = () => {
  const [answers, setAnswers] = useState<Answers>({});

  const currentStep = ["players", "type", "load", "activity"].findIndex(
    (k) => !(answers as Record<string, string>)[k]
  );
  const isDone = currentStep === -1;
  const highlightedPlan = isDone ? calcPlan(answers) : null;
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [discount, setDiscount] = useState<DiscountInfo | null>(null);
  const { currency, setCurrency, formatPrice } = useCurrency();

  const closePlan = useCallback(() => setExpandedPlan(null), []);
  const toggleExpand = (name: string) =>
    setExpandedPlan((prev) => (prev === name ? null : name));

  // Close on outside click
  useEffect(() => {
    if (!expandedPlan) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-plan-card]")) closePlan();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [expandedPlan, closePlan]);

  const pick = (stepId: string, value: string) =>
    setAnswers((prev) => ({ ...prev, [stepId]: value }));

  const reset = () => setAnswers({});

  return (
    <section className="py-24 pb-48 relative overflow-visible">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] gradient-portal opacity-20 blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-4">
            Simple, Transparent <span className="text-primary">Pricing</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            No hidden fees. No surprises. Pick a plan and start playing.
          </p>
          <p className="text-xs text-secondary mt-3 mono">Most servers choose 4GB+ for smooth gameplay</p>
          <p className="text-xs text-primary/80 mt-2 mono font-medium">⚠️ Limited Slots Available — Early Access Phase</p>
          <div className="flex justify-center mt-4">
            <CurrencySelector currency={currency} onChange={setCurrency} />
          </div>
        </motion.div>

        {/* Smart Plan Selector */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease, delay: 0.1 }}
          className="max-w-2xl mx-auto mb-8"
        >
          <div className="glass-surface rounded-sm p-5" style={{ border: "1px solid hsl(0 0% 18%)" }}>
            {/* Completed steps summary */}
            {Object.keys(answers).length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {STEPS.filter((s) => (answers as Record<string, string>)[s.id]).map((s) => (
                  <span
                    key={s.id}
                    className="px-2 py-0.5 rounded-sm text-[10px] mono flex items-center gap-1"
                    style={{ background: "hsl(350 85% 15%)", color: "hsl(350 85% 70%)", border: "1px solid hsl(350 85% 30%)" }}
                  >
                    {(answers as Record<string, string>)[s.id]}
                  </span>
                ))}
                <button
                  onClick={reset}
                  className="px-2 py-0.5 rounded-sm text-[10px] mono text-muted-foreground hover:text-white transition-colors"
                  style={{ border: "1px solid hsl(0 0% 22%)" }}
                >
                  reset
                </button>
              </div>
            )}

            {/* Active step */}
            {!isDone && (() => {
              const step = STEPS[currentStep];
              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  <p className="text-xs text-muted-foreground mono mb-3 text-center">
                    <span className="text-primary mr-1">Step {currentStep + 1}/4 —</span>
                    {step.title}
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {step.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => pick(step.id, opt)}
                        className="px-3 py-1.5 rounded-sm text-xs font-medium transition-all hover:brightness-110"
                        style={{ background: "hsl(0 0% 10%)", color: "hsl(0 0% 70%)", border: "1px solid hsl(0 0% 22%)" }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </motion.div>
              );
            })()}

            {/* Result */}
            {isDone && highlightedPlan && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-center justify-between flex-wrap gap-3"
              >
                <p className="text-sm font-semibold text-foreground">
                  Best plan for your setup:{" "}
                  <span className="text-primary">
                    {highlightedPlan} ({plans.find((p) => p.name === highlightedPlan)?.specs.ram})
                  </span>
                </p>
                <button
                  onClick={reset}
                  className="px-3 py-1 rounded-sm text-xs text-muted-foreground hover:text-white transition-colors"
                  style={{ border: "1px solid hsl(0 0% 22%)" }}
                >
                  Start over
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* AI CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease, delay: 0.15 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10"
        >
          <span className="text-xs text-muted-foreground">Not sure what you need?</span>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("open-chatbot"))}
            className="px-3 py-1.5 rounded-sm text-xs font-medium text-primary transition-all hover:brightness-125"
            style={{ border: "1px solid hsl(350 85% 35%)", background: "hsl(350 85% 10%)" }}
          >
            Ask NetherNodes AI
          </button>
        </motion.div>

        {/* Promo code */}
        <div className="max-w-sm mx-auto mb-8 flex justify-center">
          <PromoCode onDiscount={setDiscount} />
        </div>

        {/* Plan grid */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto"
          style={{ alignItems: "start", overflow: "visible" }}
        >
          {plans.map((plan, i) => {
            const isHighlighted = highlightedPlan === plan.name;
            const isPopular = plan.popular;
            const isExpanded = expandedPlan === plan.name;
            const tier = TIER_INFO[PLAN_TIER[plan.name]];

            return (
              <motion.div
                key={plan.name}
                className="relative"
                data-plan-card
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 3) * 0.08, duration: 0.45, ease }}
                whileHover={{ y: -6, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{ zIndex: isExpanded ? 50 : 1, transformOrigin: "top center" }}
              >
                {/* Outer border wrapper — one box, one border */}
                <div
                  className={`flex flex-col cursor-pointer select-none relative ${isPopular ? "bg-card" : "glass-surface"}`}
                  onClick={() => toggleExpand(plan.name)}
                  style={{
                    border: isExpanded
                      ? "1px solid hsl(350 85% 60%)"
                      : isHighlighted
                      ? "1px solid hsl(350 85% 55%)"
                      : isPopular
                      ? "1px solid hsl(350, 85%, 50%)"
                      : "1px solid hsl(0 0% 18%)",
                    borderRadius: "0.25rem",
                    boxShadow: isExpanded
                      ? "0 12px 48px hsl(350 85% 40% / 0.6)"
                      : isHighlighted
                      ? "0 0 24px hsl(350 85% 45% / 0.35)"
                      : isPopular
                      ? "0 0 16px hsl(350 85% 40% / 0.2)"
                      : undefined,
                    transition: "box-shadow 0.25s ease, border-color 0.25s ease",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px hsl(350 85% 50% / 0.55)";
                    (e.currentTarget as HTMLElement).style.borderColor = "hsl(350 85% 55%)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = isExpanded
                      ? "0 12px 48px hsl(350 85% 40% / 0.6)"
                      : isHighlighted ? "0 0 24px hsl(350 85% 45% / 0.35)"
                      : isPopular ? "0 0 16px hsl(350 85% 40% / 0.2)" : "";
                    (e.currentTarget as HTMLElement).style.borderColor = isExpanded
                      ? "hsl(350 85% 60%)"
                      : isHighlighted ? "hsl(350 85% 55%)"
                      : isPopular ? "hsl(350, 85%, 50%)" : "hsl(0 0% 18%)";
                  }}
                >
                  {/* Card content — always visible */}
                  <div className="p-5 flex flex-col">
                    {(plan.popularLabel || isHighlighted) && (
                      <div
                        className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 text-xs font-bold rounded-sm mono uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5"
                        style={{ background: "hsl(350 85% 45%)", color: "white" }}
                      >
                        {isHighlighted ? "Recommended" : plan.popularLabel}
                        {isPopular && !isHighlighted && (
                          <img src="/flame.gif" alt="" aria-hidden style={{ width: 20, height: 20, objectFit: "contain" }} />
                        )}
                      </div>
                    )}

                    <h3 className="text-base font-bold text-foreground mb-0.5">{plan.name}</h3>
                    <div className="mb-1 flex items-baseline gap-1">
                      {(() => {
                        if (plan.price === "Free") return (
                          <>
                            <span className="text-2xl font-bold text-foreground">Free</span>
                            <span className="text-xs text-muted-foreground">limited time</span>
                          </>
                        );
                        const eligible = !discount || discount.plans === "all" ||
                          (Array.isArray(discount.plans) && (discount.plans as string[]).includes(plan.name));
                        const baseFormatted = formatPrice(plan.priceInr);
                        if (discount && eligible) {
                          const discountedInr = discount.discountType === "percent"
                            ? Math.round(plan.priceInr * (1 - discount.discount / 100))
                            : Math.max(0, plan.priceInr - discount.discount);
                          const discountedFormatted = formatPrice(discountedInr);
                          return (
                            <>
                              <span className="text-lg font-bold line-through text-muted-foreground/50">{baseFormatted}</span>
                              <span className="text-2xl font-bold text-primary">{discountedFormatted}</span>
                              <span className="text-xs text-muted-foreground">/month</span>
                            </>
                          );
                        }
                        return (
                          <>
                            <span className="text-2xl font-bold text-foreground">{baseFormatted}</span>
                            <span className="text-xs text-muted-foreground">/month</span>
                          </>
                        );
                      })()}
                    </div>
                    <p className="text-[11px] text-secondary font-medium mb-3">{plan.shortLine}</p>

                    <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Users className="w-2.5 h-2.5 text-primary" />{plan.infoRow.players}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Globe className="w-2.5 h-2.5 text-primary" />{plan.infoRow.type}
                      </span>
                    </div>

                    <div className={`rounded-sm px-3 py-2 mb-3 flex flex-wrap gap-x-4 gap-y-1 ${isPopular ? "bg-primary/10 border border-primary/20" : "bg-muted/50 border border-border"}`}>
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <MemoryStick className="w-3.5 h-3.5 text-primary" />{plan.specs.ram}
                      </span>
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-primary" />{plan.specs.cpu}
                      </span>
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <HardDrive className="w-3.5 h-3.5 text-primary" />{plan.specs.ssd}
                      </span>
                    </div>

                    <div className="mb-3">
                      <p className="text-[10px] text-muted-foreground mb-1">Performance</p>
                      <div className="h-1 rounded-full bg-muted/60 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: plan.perfWidth, background: "hsl(350 85% 50%)" }} />
                      </div>
                    </div>

                    <CheckoutButton
                      planName={plan.name}
                      planPriceInr={plan.priceInr}
                      discountedPriceInr={(() => {
                        if (!discount || plan.priceInr === 0) return undefined;
                        const eligible = discount.plans === "all" ||
                          (Array.isArray(discount.plans) && (discount.plans as string[]).includes(plan.name));
                        if (!eligible) return undefined;
                        return discount.discountType === "percent"
                          ? Math.round(plan.priceInr * (1 - discount.discount / 100))
                          : Math.max(0, plan.priceInr - discount.discount);
                      })()}
                      currency={currency}
                      label={plan.btnLabel}
                      isPopular={isPopular}
                      className="mb-2"
                    />

                    <div className="flex items-center justify-center gap-1 pt-1">
                      <ChevronDown
                        className="w-3 h-3 text-muted-foreground/40 transition-transform duration-200"
                        style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                      />
                      <span className="text-[10px] text-muted-foreground/40">
                        {isExpanded ? "tap to close" : "tap for details"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details panel — absolutely positioned, same border, no seam, no layout shift */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      key="details"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: "absolute",
                        top: "calc(100% - 1px)",
                        left: 0,
                        right: 0,
                        zIndex: 50,
                        background: isPopular ? "hsl(260 12% 7%)" : "hsl(0 0% 7%)",
                        border: "1px solid hsl(350 85% 60%)",
                        borderTop: "none",
                        borderRadius: "0 0 0.25rem 0.25rem",
                        boxShadow: "0 20px 60px hsl(350 85% 30% / 0.6), 0 4px 20px rgba(0,0,0,0.8)",
                        padding: "16px",
                      }}
                    >
                      {tier.badge && (
                        <div className="mb-2">
                          <span
                            className="px-2 py-0.5 rounded-sm text-[9px] font-semibold mono uppercase tracking-wider"
                            style={{ background: "hsl(350 85% 20%)", color: "hsl(350 85% 70%)", border: "1px solid hsl(350 85% 35%)" }}
                          >{tier.badge}</span>
                        </div>
                      )}

                      <div className="mb-3">
                        <p className="text-[9px] text-muted-foreground/50 mono uppercase tracking-wider mb-1.5">Core Features</p>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                          {CORE_FEATURES.map((f) => (
                            <div key={f} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Check className="w-2.5 h-2.5 text-primary shrink-0" />{f}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mb-3">
                        <p className="text-[9px] text-muted-foreground/50 mono uppercase tracking-wider mb-1.5">Plan Includes</p>
                        <div className="space-y-1.5">
                          {tier.features.map((f) => (
                            <div key={f.label} className="flex items-start justify-between gap-2">
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
                                <span>{f.icon}</span>{f.label}
                              </span>
                              <span className="text-[10px] text-foreground/80 text-right">{f.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-sm px-2.5 py-1.5 mb-3" style={{ background: "hsl(350 85% 10%)", border: "1px solid hsl(350 85% 25%)" }}>
                        <p className="text-[10px] text-primary/80">{tier.hook}</p>
                      </div>

                      <p className="text-[9px] text-muted-foreground/40 mono mb-3">{tier.hardware}</p>

                      <CheckoutButton
                        planName={plan.name}
                        planPriceInr={plan.priceInr}
                        discountedPriceInr={(() => {
                          if (!discount || plan.priceInr === 0) return undefined;
                          const eligible = discount.plans === "all" ||
                            (Array.isArray(discount.plans) && (discount.plans as string[]).includes(plan.name));
                          if (!eligible) return undefined;
                          return discount.discountType === "percent"
                            ? Math.round(plan.priceInr * (1 - discount.discount / 100))
                            : Math.max(0, plan.priceInr - discount.discount);
                        })()}
                        currency={currency}
                        label={plan.btnLabel}
                        isPopular={isPopular}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
        {/* Coming Soon Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.6, ease }}
          className="mt-16 max-w-3xl mx-auto glass-surface rounded-sm p-8 md:p-10 text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <Rocket className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-bold text-foreground">More locations coming soon 🌍</h3>
          </div>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-3">
            We're expanding beyond India — new server regions are on the way for lower latency worldwide.
          </p>
          <p className="text-xs text-secondary font-medium">
            Early users will get priority access to new regions when they launch.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
