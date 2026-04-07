import { motion } from "framer-motion";
import { Zap, Rocket, Gamepad2, Shield, Package, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { use3DTilt } from "@/hooks/use3DTilt";

const points = [
  { icon: Zap,             title: "Ultra-Low Ping in India",       desc: "Servers hosted in India for the best latency. No delays, no rubberbanding — just smooth gameplay." },
  { icon: Rocket,          title: "Instant Deployment",             desc: "Go from signup to playing in under a minute. No complicated setup, no delays." },
  { icon: Gamepad2,        title: "Built for Minecraft",            desc: "Hardware and software tuned for Minecraft performance. Stable TPS whether you're with friends or running a community." },
  { icon: Shield,          title: "DDoS Protection Included",       desc: "Every server is protected from attacks, keeping your world online and secure at all times." },
  { icon: Package,         title: "Plugins & Modpacks Ready",       desc: "From simple survival worlds to heavy modpacks, NetherNodes handles it all. One-click installers make setup effortless." },
  { icon: TrendingUp,      title: "Scale When You Grow",            desc: "Start small and upgrade anytime. As your server grows, NetherNodes grows with you — no migration headaches." },
];

const ease = [0.16, 1, 0.3, 1] as const;

const WhyCard = ({ p, i }: { p: typeof points[0]; i: number }) => {
  const { ref, onMouseMove, onMouseLeave } = use3DTilt(8);
  return (
    <motion.div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: (i % 3) * 0.07, duration: 0.5, ease }}
      className="glass-surface rounded-sm p-5 group nether-border-hover"
      style={{ transformStyle: "preserve-3d", willChange: "transform" }}
    >
      <div className="flex items-start gap-3">
        <p.icon
          className="w-5 h-5 text-primary mt-0.5 shrink-0 group-hover:drop-shadow-[0_0_8px_hsla(350,85%,50%,0.5)] transition-all"
          style={{ transform: "translateZ(16px)" }}
        />
        <div>
          <h3 className="text-sm font-bold text-foreground mb-1" style={{ transform: "translateZ(12px)" }}>{p.title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed" style={{ transform: "translateZ(6px)" }}>{p.desc}</p>
        </div>
      </div>
    </motion.div>
  );
};

const WhyChooseSection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[500px] h-[500px] gradient-portal opacity-30 blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-4">
            Why Choose <span className="text-secondary glow-text-secondary">NetherNodes</span>?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Built for Performance, Not Just Hosting — everything you need to run a great server.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto mb-14">
          {points.map((p, i) => (
            <WhyCard key={p.title} p={p} i={i} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease, delay: 0.2 }}
          className="text-center"
        >
          <p className="text-sm text-muted-foreground mb-4">
            Ready to Start? Launch your Minecraft server in seconds.
          </p>
          <Link
            to="/pricing"
            className="inline-flex items-center h-11 px-8 bg-primary text-primary-foreground font-semibold text-sm rounded-sm nether-glow hover:brightness-110 transition-all"
          >
            Start Your Server
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default WhyChooseSection;
