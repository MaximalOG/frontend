import { useEffect, useRef } from "react";

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; opacity: number;
  color: string; life: number; maxLife: number;
}

const COLORS = [
  "hsl(350,85%,55%)",
  "hsl(350,85%,45%)",
  "hsl(270,70%,60%)",
  "hsl(270,70%,50%)",
];

export const NetherParticles = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    const particles: Particle[] = [];

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const spawn = () => {
      const maxLife = 140 + Math.random() * 160;
      particles.push({
        x: Math.random() * canvas.width,
        y: canvas.height + 10,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -(0.35 + Math.random() * 0.65),
        size: 1 + Math.random() * 2,
        opacity: 0,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        life: 0,
        maxLife,
      });
    };

    let frame = 0;
    const tick = () => {
      frame++;
      // Spawn less frequently
      if (frame % 8 === 0) spawn();

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Batch by color to avoid repeated fillStyle changes
      const byColor: Record<string, Particle[]> = {};
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vx += (Math.random() - 0.5) * 0.03;

        const progress = p.life / p.maxLife;
        p.opacity = progress < 0.2
          ? (progress / 0.2) * 0.65
          : progress > 0.7
          ? ((1 - (progress - 0.7) / 0.3)) * 0.65
          : 0.65;

        if (p.life >= p.maxLife || p.y < -20) {
          particles.splice(i, 1);
          continue;
        }
        if (!byColor[p.color]) byColor[p.color] = [];
        byColor[p.color].push(p);
      }

      // Draw batched — no shadowBlur, no save/restore per particle
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
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 1 }}
      aria-hidden="true"
    />
  );
};
