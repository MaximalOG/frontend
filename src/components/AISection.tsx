import { motion } from "framer-motion";
import { Brain, Bug, Puzzle, TrendingUp } from "lucide-react";

const aiFeatures = [
  { icon: Brain, title: "AI Server Optimization", desc: "Automatically tunes your server settings based on player count and mod load for peak performance." },
  { icon: Bug, title: "Auto Error Fixing", desc: "Detects errors in your server logs and applies fixes automatically — no manual debugging needed." },
  { icon: Puzzle, title: "Plugin Recommendations", desc: "Get smart suggestions for plugins based on your server type, size, and community preferences." },
  { icon: TrendingUp, title: "Performance Insights", desc: "Real-time analytics and suggestions to keep your server running smoothly as it scales." },
];

const ease = [0.16, 1, 0.3, 1] as const;

const AISection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute top-1/2 right-0 w-[500px] h-[500px] gradient-portal opacity-25 blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 glass-surface rounded-sm text-xs mono text-secondary mb-4">
            COMING SOON
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-4">
            Smart Hosting with <span className="text-secondary glow-text-secondary">AI</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            The future of Minecraft hosting — intelligent, automated, and always learning.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {aiFeatures.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5, ease }}
              className="glass-surface rounded-sm p-6 group nether-border-hover"
            >
              <f.icon className="w-8 h-8 text-secondary mb-4 group-hover:drop-shadow-[0_0_8px_hsla(270,70%,60%,0.5)] transition-all" />
              <h3 className="text-lg font-bold mb-2 text-foreground">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AISection;
