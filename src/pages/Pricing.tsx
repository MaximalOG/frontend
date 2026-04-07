import { useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import PricingSection from "@/components/PricingSection";
import SubdomainChecker from "@/components/SubdomainChecker";
import Footer from "@/components/Footer";

// Fixed-position particle canvas — uses window dimensions, never resizes on scroll
const PricingParticles = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    const particles: {
      x: number; y: number; vx: number; vy: number;
      size: number; opacity: number; color: string; life: number; maxLife: number;
    }[] = [];

    const COLORS = [
      "hsl(350,85%,50%)", "hsl(350,85%,40%)",
      "hsl(270,70%,55%)", "hsl(270,70%,45%)",
    ];

    // Set canvas to viewport size once — never resize on scroll
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    // Only resize on actual window resize, not scroll
    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    let frame = 0;
    const tick = () => {
      frame++;
      if (frame % 7 === 0) {
        const maxLife = 160 + Math.random() * 200;
        particles.push({
          x: Math.random() * canvas.width,
          y: canvas.height + 10,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -(0.3 + Math.random() * 0.6),
          size: 0.8 + Math.random() * 2,
          opacity: 0,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          life: 0,
          maxLife,
        });
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Batch by color — no shadowBlur, no save/restore per particle
      const byColor: Record<string, typeof particles> = {};
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vx += (Math.random() - 0.5) * 0.03;

        const prog = p.life / p.maxLife;
        p.opacity = prog < 0.2
          ? (prog / 0.2) * 0.6
          : prog > 0.7
          ? ((1 - (prog - 0.7) / 0.3)) * 0.6
          : 0.6;

        if (p.life >= p.maxLife || p.y < -20) { particles.splice(i, 1); continue; }
        if (!byColor[p.color]) byColor[p.color] = [];
        byColor[p.color].push(p);
      }

      for (const [color, group] of Object.entries(byColor)) {
        ctx.fillStyle = color;
        for (const p of group) {
          ctx.globalAlpha = p.opacity;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(tick);
    };

    tick();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0, left: 0,
        width: "100vw", height: "100vh",
        pointerEvents: "none",
        zIndex: 0,
      }}
      aria-hidden
    />
  );
};

const Pricing = () => {
  return (
    <div className="min-h-screen bg-background pt-16 relative overflow-x-hidden">
      <Navbar />

      {/* Fixed particle layer — never affected by scroll */}
      <PricingParticles />

      {/* Static ambient orbs — CSS only, no JS animation */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div style={{ position: "absolute", top: "10%", left: "5%", width: 500, height: 500, background: "radial-gradient(circle, hsl(350 85% 45% / 0.1) 0%, transparent 70%)", filter: "blur(40px)" }} />
        <div style={{ position: "absolute", top: "40%", right: "0%", width: 600, height: 600, background: "radial-gradient(circle, hsl(270 70% 55% / 0.08) 0%, transparent 70%)", filter: "blur(50px)" }} />
        <div style={{ position: "absolute", bottom: "10%", left: "30%", width: 400, height: 400, background: "radial-gradient(circle, hsl(350 85% 40% / 0.07) 0%, transparent 70%)", filter: "blur(35px)" }} />
        <div style={{ position: "absolute", top: 64, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, hsl(350 85% 50% / 0.3) 30%, hsl(270 70% 55% / 0.3) 70%, transparent)" }} />
      </div>

      {/* Content */}
      <div className="relative" style={{ zIndex: 2 }}>
        <PricingSection />
        <Footer />
      </div>
    </div>
  );
};

export default Pricing;
