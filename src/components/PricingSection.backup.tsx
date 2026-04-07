import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Rocket, Cpu, HardDrive, MemoryStick, Users, Puzzle, Globe } from "lucide-react";
import { Link } from "react-router-dom";

const serverTypes = [
  { id: "casual", label: "Casual", sub: "friends, survival", highlight: "Basic" },
  { id: "smp",    label: "SMP",    sub: "moderate plugins",  highlight: "Starter" },
  { id: "heavy",  label: "Heavy",  sub: "many plugins / active", highlight: "Pro" },
];

const plans = [
  {
    name: "Nano",
    price: "₹79",
    priceNote: "/month",
    description: "Testing and development servers",
    shortLine: "Testing / development",
    btnLabel: "Start Nano Server",
    specs: { ram: "1GB RAM", ssd: "5GB SSD", cpu: "100% CPU" },
    infoRow: { players: "1–2 players", plugins: "No modded", type: "Testing / dev" },
    usageLines: ["1–2 players (vanilla/light)", "Not for modded", "Testing / development"],
    perfWidth: "70%",
    popular: false,
    popularLabel: null,
    features: ["Full Panel Access", "DDoS Protection", "Instant Setup", "Community Support"],
  },
  {
    name: "Basic",
    price: "Free",
    priceNote: "limited time",
    description: "Small vanilla server for friends",
    shortLine: "Small vanilla friends server",
    btnLabel: "Start Free Server",
    specs: { ram: "2GB RAM", ssd: "10GB SSD", cpu: "175% CPU" },
    infoRow: { players: "1–5 players", plugins: "No modded", type: "Vanilla / Survival" },
    usageLines: ["1–5 players", "Not for modded", "Small vanilla friends server"],
    perfWidth: "72%",
    popular: false,
    popularLabel: null,
    features: ["Full Panel Access", "DDoS Protection", "Instant Setup", "Community Support"],
  },
  {
    name: "Plus",
    price: "₹149",
    priceNote: "/month",
    description: "Light SMP for small groups",
    shortLine: "Light SMP",
    btnLabel: "Start Plus Server",
    specs: { ram: "3GB RAM", ssd: "15GB SSD", cpu: "250% CPU" },
    infoRow: { players: "5–10 players", plugins: "No modded", type: "Light SMP" },
    usageLines: ["5–10 players", "Not for modded", "Light SMP"],
    perfWidth: "74%",
    popular: false,
    popularLabel: null,
    features: ["Full Panel Access", "DDoS Protection", "Instant Setup", "Daily Backups"],
  },
  {
    name: "Starter",
    price: "₹199",
    priceNote: "/month",
    description: "Small plugin server with light modded support",
    shortLine: "Small plugin server",
    btnLabel: "Start Starter Server",
    specs: { ram: "4GB RAM", ssd: "20GB SSD", cpu: "325% CPU" },
    infoRow: { players: "10–15 players", plugins: "1–3 modded", type: "Plugin server" },
    usageLines: ["10–15 players (vanilla/plugins)", "1–3 modded", "Small plugin server"],
    perfWidth: "76%",
    popular: true,
    popularLabel: "Most Chosen",
    features: ["Full Panel Access", "DDoS Protection", "24/7 Uptime", "1-Click Plugins", "Daily Backups"],
  },
  {
    name: "Pro",
    price: "₹349",
    priceNote: "/month",
    description: "Modded co-op with solid plugin support",
    shortLine: "Modded co-op",
    btnLabel: "Start Pro Server",
    specs: { ram: "6GB RAM", ssd: "40GB SSD", cpu: "450% CPU" },
    infoRow: { players: "15–20 players", plugins: "3–8 modded", type: "Modded co-op" },
    usageLines: ["15–20 players", "3–8 modded", "Modded co-op"],
    perfWidth: "78%",
    popular: false,
    popularLabel: null,
    features: ["Full Panel Access", "Priority Support", "DDoS Protection", "24/7 Uptime", "Daily Backups"],
  },
  {
    name: "Elite",
    price: "₹549",
    priceNote: "/month",
    description: "Small modded community server",
    shortLine: "Small modded community",
    btnLabel: "Start Elite Server",
    specs: { ram: "8GB RAM", ssd: "60GB SSD", cpu: "600% CPU" },
    infoRow: { players: "20–30 players", plugins: "8–12 modded", type: "Modded community" },
    usageLines: ["20–30 players", "8–12 modded", "Small modded community"],
    perfWidth: "79%",
    popular: false,
    popularLabel: null,
    features: ["Full Panel Access", "Priority Support", "DDoS Protection", "24/7 Uptime", "Daily Backups"],
  },
  {
    name: "Ultra",
    price: "₹749",
    priceNote: "/month",
    description: "Heavy modpacks with large player counts",
    shortLine: "Heavy modpacks",
    btnLabel: "Start Ultra Server",
    specs: { ram: "10GB RAM", ssd: "80GB SSD", cpu: "750% CPU" },
    infoRow: { players: "30–45 players", plugins: "12–20 modded", type: "Heavy modpacks" },
    usageLines: ["30–45 players", "12–20 modded", "Heavy modpacks"],
    perfWidth: "81%",
    popular: false,
    popularLabel: null,
    features: ["Full Panel Access", "Priority Support", "DDoS Protection", "24/7 Uptime", "Daily Backups"],
  },
  {
    name: "Max",
    price: "₹999",
    priceNote: "/month",
    description: "Large modded SMP with high player capacity",
    shortLine: "Large modded SMP",
    btnLabel: "Start Max Server",
    specs: { ram: "12GB RAM", ssd: "100GB SSD", cpu: "900% CPU" },
    infoRow: { players: "45–60 players", plugins: "20–30 modded", type: "Large modded SMP" },
    usageLines: ["45–60 players", "20–30 modded", "Large modded SMP"],
    perfWidth: "83%",
    popular: false,
    popularLabel: null,
    features: ["Full Panel Access", "Priority Support", "DDoS Protection", "24/7 Uptime", "Daily Backups"],
  },
  {
    name: "Titan",
    price: "₹1,499",
    priceNote: "/month",
    description: "Networks and large modpack servers",
    shortLine: "Networks / large modpacks",
    btnLabel: "Start Titan Server",
    specs: { ram: "16GB RAM", ssd: "150GB SSD", cpu: "1200% CPU" },
    infoRow: { players: "60–100+ players", plugins: "30–50 modded", type: "Network / large modpacks" },
    usageLines: ["60–100+ players", "30–50 modded", "Networks / large modpacks"],
    perfWidth: "85%",
    popular: false,
    popularLabel: null,
    features: ["Full Panel Access", "Priority Support", "DDoS Protection", "24/7 Uptime", "Daily Backups"],
  },
];

const ease = [0.16, 1, 0.3, 1] as const;

const PricingSection = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const highlightedPlan = serverTypes.find(t => t.id === selected)?.highlight ?? null;

  return (
    <section className="py-24 relative overflow-hidden">
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
        </motion.div>

        {/* Server type selector */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease, delay: 0.1 }}
          className="flex flex-col items-center gap-3 mb-8"
        >
          <p className="text-xs text-muted-foreground mono">What are you running?</p>
          <div className="flex gap-2 flex-wrap justify-center">
            {serverTypes.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(selected === t.id ? null : t.id)}
                className="px-4 py-2 rounded-sm text-xs font-medium transition-all"
                style={
                  selected === t.id
                    ? { background: "hsl(350 85% 45%)", color: "white", border: "1px solid hsl(350 85% 55%)", boxShadow: "0 0 12px hsl(350 85% 40% / 0.4)" }
                    : { background: "hsl(0 0% 10%)", color: "hsl(0 0% 65%)", border: "1px solid hsl(0 0% 20%)" }
                }
              >
                {t.label} <span className="ml-1 opacity-60 font-normal">{t.sub}</span>
              </button>
            ))}
          </div>
          {highlightedPlan && (
            <p className="text-xs text-primary mono">→ {highlightedPlan} plan recommended for your setup</p>
          )}
        </motion.div>

        {/* AI CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease, delay: 0.15 }}
          className="flex items-center justify-center gap-3 mb-10"
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

        {/* Plan grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
          {plans.map((plan, i) => {
            const isHighlighted = highlightedPlan === plan.name;
            const isPopular = plan.popular;
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 3) * 0.08, duration: 0.45, ease }}
                whileHover={{ scale: 1.02, transition: { duration: 0.15 } }}
                className={`rounded-sm p-5 relative flex flex-col ${isPopular ? "bg-card" : "glass-surface"}`}
                style={{
                  border: isHighlighted
                    ? "1px solid hsl(350 85% 60%)"
                    : isPopular
                    ? "1px solid hsl(350, 85%, 50%)"
                    : "1px solid hsl(0 0% 18%)",
                  boxShadow: isHighlighted
                    ? "0 0 24px hsl(350 85% 45% / 0.4)"
                    : isPopular
                    ? "0 0 16px hsl(350 85% 40% / 0.2)"
                    : undefined,
                  transition: "box-shadow 0.3s, border-color 0.3s",
                }}
              >
                {/* Badge */}
                {(plan.popularLabel || isHighlighted) && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-[10px] font-semibold rounded-sm mono uppercase tracking-wider whitespace-nowrap"
                    style={{ background: "hsl(350 85% 45%)", color: "white" }}
                  >
                    {isHighlighted ? "Recommended" : plan.popularLabel}
                  </div>
                )}

                {/* Name + price */}
                <h3 className="text-base font-bold text-foreground mb-0.5">{plan.name}</h3>
                <div className="mb-1 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-xs text-muted-foreground">{plan.priceNote}</span>
                </div>
                <p className="text-[11px] text-secondary font-medium mb-3">{plan.shortLine}</p>

                {/* Info row */}
                <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Users className="w-2.5 h-2.5 text-primary" />{plan.infoRow.players}</span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Puzzle className="w-2.5 h-2.5 text-primary" />{plan.infoRow.plugins}</span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Globe className="w-2.5 h-2.5 text-primary" />{plan.infoRow.type}</span>
                </div>

                {/* Specs */}
                <div className={`rounded-sm px-3 py-2.5 mb-3 space-y-1.5 ${isPopular ? "bg-primary/10 border border-primary/20" : "bg-muted/50 border border-border"}`}>
                  <div className="flex items-center gap-2">
                    <MemoryStick className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-base font-bold text-foreground">{plan.specs.ram}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span className="text-xs font-semibold text-foreground">{plan.specs.ssd}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Cpu className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span className="text-xs font-semibold text-foreground">{plan.specs.cpu}</span>
                  </div>
                </div>

                {/* Performance bar */}
                <div className="mb-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Optimized for</p>
                  <div className="h-1 rounded-full bg-muted/60 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: plan.perfWidth, background: "hsl(350 85% 50%)" }} />
                  </div>
                </div>

                {/* Use case bullets */}
                <div className="mb-3 space-y-0.5">
                  {plan.usageLines.map((line) => (
                    <p key={line} className="text-[10px] text-muted-foreground/80 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-primary/60 flex-shrink-0" />{line}
                    </p>
                  ))}
                </div>

                {/* CTA */}
                <Link
                  to="/pricing"
                  className={`w-full h-9 flex items-center justify-center rounded-sm font-medium text-xs transition-all mb-3 ${
                    isPopular
                      ? "bg-primary text-primary-foreground nether-glow hover:brightness-110"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  {plan.btnLabel}
                </Link>

                {/* Features */}
                <div className="space-y-1.5 flex-1">
                  {plan.features.slice(0, 4).map((f) => (
                    <div key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="w-3 h-3 text-primary flex-shrink-0" />{f}
                    </div>
                  ))}
                  {plan.features.length > 4 && (
                    <p className="text-[10px] text-muted-foreground/60 pl-4">+ more</p>
                  )}
                </div>
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
            <h3 className="text-xl font-bold text-foreground">More plans coming soon 🚀</h3>
          </div>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-3">
            We're expanding to support larger servers and advanced features.
          </p>
          <p className="text-xs text-secondary font-medium">
            Early users will receive priority upgrades and exclusive discounts.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
