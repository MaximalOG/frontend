import { useRef, useCallback } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { Link } from "react-router-dom";
import { NetherParticles } from "./NetherParticles";

const ease = [0.16, 1, 0.3, 1] as const;

const HeroSection = () => {
  const consoleRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), { stiffness: 120, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-10, 10]), { stiffness: 120, damping: 20 });

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = consoleRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  }, [mouseX, mouseY]);

  const onMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Ambient glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] gradient-portal opacity-60 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] gradient-nether opacity-40 blur-3xl pointer-events-none" />

      {/* Floating nether particles */}
      <NetherParticles />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease }}
          className="max-w-4xl mx-auto text-center"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6, ease }}
            className="inline-flex items-center gap-2 px-4 py-1.5 glass-surface rounded-sm text-xs mono text-muted-foreground mb-8"
          >
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            3 Nodes Online • India Region • Ultra Low Ping
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-none mb-6">
            Power Your Minecraft Server{" "}
            <span className="text-primary glow-text-primary">Instantly</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-4" style={{ textWrap: "pretty" }}>
            High-performance Minecraft hosting with instant setup, low latency, and full control.
          </p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6, ease }}
            className="text-sm md:text-base text-secondary font-medium mb-10"
          >
            🇮🇳 Optimized for Indian Players — Experience ultra-low ping with servers located in India.
          </motion.p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/pricing"
              className="h-12 px-8 bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center rounded-sm nether-glow hover:brightness-110 transition-all hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3)]"
            >
              Start Your Server
            </Link>
            <Link
              to="/pricing"
              className="h-12 px-8 nether-border-hover text-foreground font-medium text-sm flex items-center justify-center rounded-sm bg-muted/30 hover:bg-muted/50 transition-all"
            >
              Launch in 60 Seconds
            </Link>
          </div>
        </motion.div>

        {/* 3D Console mockup — mouse-tracked tilt */}
        <motion.div
          ref={consoleRef}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8, ease }}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          style={{
            rotateX,
            rotateY,
            transformStyle: "preserve-3d",
            perspective: 1000,
          }}
          className="mt-16 max-w-3xl mx-auto cursor-default"
        >
          {/* Glow layer behind console */}
          <div
            className="absolute inset-0 rounded-sm pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 50% 80%, hsl(350 85% 40% / 0.25) 0%, transparent 70%)",
              filter: "blur(20px)",
              transform: "translateZ(-10px)",
            }}
          />
          <div className="glass-surface rounded-sm overflow-hidden" style={{ transform: "translateZ(0px)" }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
              <div className="w-3 h-3 rounded-full bg-primary/60" />
              <div className="w-3 h-3 rounded-full bg-secondary/40" />
              <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
              <span className="ml-2 text-xs mono text-muted-foreground">NetherNodes-console</span>
            </div>
            <div className="p-4 mono text-sm text-muted-foreground space-y-1">
              <p><span className="text-secondary">[NetherNodes]</span> Allocating resources...</p>
              <p><span className="text-secondary">[NetherNodes]</span> Optimizing for India routing...</p>
              <p><span className="text-secondary">[NetherNodes]</span> Plugins loaded: <span className="text-foreground">EssentialsX, WorldEdit, Vault</span></p>
              <p><span className="text-secondary">[NetherNodes]</span> Server ready at <span className="text-primary">yourserver.nethernodes.gg</span></p>
              <p><span className="text-green-400">[Done]</span> Ready in <span className="text-foreground">1.2s</span> — <span className="text-foreground">0 players online</span></p>
              <p className="flex items-center">
                <span className="text-primary">{">"}</span>
                <span className="animate-terminal-blink ml-1">▊</span>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
