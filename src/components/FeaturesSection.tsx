import { motion } from "framer-motion";
import { Zap, Globe, Layout, Shield, Puzzle, MessageCircle } from "lucide-react";
import { use3DTilt } from "@/hooks/use3DTilt";

const features = [
  { icon: Zap,           title: "Instant Server Setup",    desc: "Your server is live in under 60 seconds. No complicated configuration needed." },
  { icon: Globe,         title: "Low Latency (India)",     desc: "Servers located in India for ultra-low ping and smooth gameplay for Indian players." },
  { icon: Layout,        title: "Full Control Panel",      desc: "Intuitive dashboard to manage your server, files, and plugins effortlessly." },
  { icon: Shield,        title: "DDoS Protection",         desc: "Advanced network filtering keeps your server safe from attacks around the clock." },
  { icon: Puzzle,        title: "1-Click Plugin Installer",desc: "Install plugins and modpacks with a single click. No FTP or file editing needed." },
  { icon: MessageCircle, title: "Fast Discord Support",    desc: "Get help quickly from our team and community via Discord." },
];

const ease = [0.16, 1, 0.3, 1] as const;

const FeatureCard = ({ f, i }: { f: typeof features[0]; i: number }) => {
  const { ref, onMouseMove, onMouseLeave } = use3DTilt(10);
  return (
    <motion.div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: i * 0.1, duration: 0.5, ease }}
      className="glass-surface rounded-sm p-6 group nether-border-hover"
      style={{ transformStyle: "preserve-3d", willChange: "transform" }}
    >
      <f.icon
        className="w-8 h-8 text-primary mb-4 group-hover:drop-shadow-[0_0_8px_hsla(350,85%,50%,0.5)] transition-all"
        style={{ transform: "translateZ(20px)" }}
      />
      <h3 className="text-lg font-bold mb-2 text-foreground" style={{ transform: "translateZ(14px)" }}>{f.title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed" style={{ transform: "translateZ(8px)" }}>{f.desc}</p>
    </motion.div>
  );
};

const FeaturesSection = () => {
  return (
    <section className="relative py-24 overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] gradient-nether opacity-30 blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-4">
            Built for <span className="text-primary">Performance</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Everything you need to run a great Minecraft server, right out of the box.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => <FeatureCard key={f.title} f={f} i={i} />)}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
