import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Cpu, HardDrive, Zap, Shield, Target, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const ease = [0.16, 1, 0.3, 1] as const;

function useTypewriter(text: string, delay = 800) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    let i = 0;
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) { clearInterval(interval); setDone(true); }
      }, 55);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, delay]);
  return { displayed, done };
}

const About = () => {
  const { displayed, done } = useTypewriter("Designed for Gamers.", 600);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] gradient-portal opacity-40 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] gradient-nether opacity-30 blur-3xl pointer-events-none" />

        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease }}
          >
            <p className="text-xs mono text-muted-foreground uppercase tracking-widest mb-4">About NetherNodes</p>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter leading-tight mb-6">
              Built for Performance.<br />
              <span className="text-primary glow-text-primary">
                {displayed}
                {!done && (
                  <span
                    className="inline-block w-[3px] h-[1em] ml-1 align-middle bg-primary animate-pulse"
                  />
                )}
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Simple, fast, and reliable Minecraft hosting — without the complexity.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Story ── */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease }}
          >
            <p className="text-xs mono text-primary uppercase tracking-widest mb-4">Our Story</p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tighter mb-6 text-foreground">
              Hosting that gets out of your way
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>NetherNodes was built with one goal: make Minecraft hosting simple. Not just easy to sign up for — actually simple to use, manage, and scale.</p>
              <p>Most hosting platforms are built for system administrators. We built ours for players. Whether you're running a small survival world with friends or managing a large modded community, the experience should be the same — fast, clean, and reliable.</p>
              <p>We're focused on the Indian gaming community, where latency has always been a problem. Our infrastructure is placed to give you the lowest possible ping without compromise.</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Vision ── */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[400px] h-[400px] gradient-portal opacity-15 blur-3xl pointer-events-none" />
        <div className="container mx-auto px-4 max-w-4xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease }}
            className="text-center mb-12"
          >
            <p className="text-xs mono text-muted-foreground uppercase tracking-widest mb-4">Vision</p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tighter text-foreground">Where we're going</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Users,  title: "Hosting for everyone",       desc: "No technical knowledge required. If you can click a button, you can run a server." },
              { icon: Target, title: "Performance at every price", desc: "High-performance hardware shouldn't be a premium feature. Every plan gets the same quality infrastructure." },
              { icon: Zap,    title: "Scale without friction",     desc: "Start small, grow big. Upgrade your plan in seconds with zero downtime or migration headaches." },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5, ease }}
                className="glass-surface rounded-sm p-6 nether-border-hover"
              >
                <item.icon className="w-6 h-6 text-primary mb-3" />
                <h3 className="text-sm font-bold text-foreground mb-2">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Technology ── */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease }}
            className="mb-10"
          >
            <p className="text-xs mono text-primary uppercase tracking-widest mb-4">Technology</p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tighter mb-6 text-foreground">What runs under the hood</h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              We don't cut corners on hardware. Every server runs on infrastructure built for consistent, predictable performance — not shared consumer-grade machines.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: Cpu,       label: "High-performance CPUs", detail: "Enterprise-grade processors optimized for Minecraft's single-threaded workloads" },
              { icon: HardDrive, label: "SSD Storage",           detail: "Fast NVMe storage for quick world loading and low I/O latency" },
              { icon: Shield,    label: "DDoS Protection",       detail: "Network-level filtering on every plan — no extra cost, no configuration needed" },
              { icon: Zap,       label: "Optimized Networking",  detail: "Low-latency routing with India-region nodes for the best possible ping" },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4, ease }}
                className="flex items-start gap-4 glass-surface rounded-sm p-4"
                style={{ border: "1px solid hsl(0 0% 14%)" }}
              >
                <div className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "hsl(350 85% 10%)", border: "1px solid hsl(350 85% 20%)" }}>
                  <item.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-0.5">{item.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.detail}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 gradient-nether opacity-30 blur-3xl pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease }}
            className="glass-surface rounded-sm p-12 text-center max-w-2xl mx-auto"
          >
            <h2 className="text-2xl md:text-4xl font-bold tracking-tighter mb-4">
              Start your server <span className="text-primary glow-text-primary">today</span>
            </h2>
            <p className="text-muted-foreground mb-8">
            </p>
            <Link
              to="/pricing"
              className="inline-flex h-12 px-8 bg-primary text-primary-foreground font-semibold text-sm items-center rounded-sm nether-glow hover:brightness-110 transition-all"
            >
              View Plans
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
