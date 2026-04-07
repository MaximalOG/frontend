import { motion } from "framer-motion";
import { ShieldCheck, Zap, Globe } from "lucide-react";

const items = [
  {
    icon: ShieldCheck,
    title: "99.9% Uptime",
    desc: "Infrastructure designed for reliability. Your server stays online so your players can keep playing.",
  },
  {
    icon: Zap,
    title: "Instant Setup",
    desc: "From payment to live server in under 60 seconds. No configuration, no waiting.",
  },
  {
    icon: Globe,
    title: "Performance Ready",
    desc: "Optimized nodes in India for ultra-low latency. Built to handle real player loads.",
  },
];

const ease = [0.16, 1, 0.3, 1] as const;

const TrustSection = () => (
  <section className="py-20 relative overflow-hidden">
    <div className="absolute left-0 top-1/3 w-[400px] h-[400px] gradient-nether opacity-15 blur-3xl pointer-events-none" />
    <div className="container mx-auto px-4 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease }}
        className="text-center mb-12"
      >
        <p className="text-xs mono text-muted-foreground uppercase tracking-widest mb-3">Why teams trust us</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tighter">
          Built to <span className="text-primary">just work</span>
        </h2>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {items.map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5, ease }}
            whileHover={{ y: -4 }}
            className="glass-surface rounded-sm p-6 group cursor-default"
            style={{ border: "1px solid hsl(0 0% 14%)", transition: "border-color 0.2s ease" }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "hsl(350 85% 35%)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "hsl(0 0% 14%)")}
          >
            <div
              className="w-10 h-10 rounded-sm flex items-center justify-center mb-4"
              style={{ background: "hsl(350 85% 10%)", border: "1px solid hsl(350 85% 25%)" }}
            >
              <item.icon className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-2">{item.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default TrustSection;
