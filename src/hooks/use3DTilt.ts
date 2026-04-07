import { useRef, useCallback } from "react";

/**
 * Lightweight 3D tilt — uses direct style mutation, no DOM creation on mousemove.
 */
export function use3DTilt(strength = 10) {
  const ref = useRef<HTMLDivElement>(null);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width  - 0.5;
    const y = (e.clientY - rect.top)  / rect.height - 0.5;
    el.style.transform = `perspective(800px) rotateX(${-y * strength}deg) rotateY(${x * strength}deg) scale3d(1.02,1.02,1.02)`;
    el.style.transition = "transform 0.1s ease-out";
  }, [strength]);

  const onMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
    el.style.transition = "transform 0.45s cubic-bezier(0.16,1,0.3,1)";
  }, []);

  return { ref, onMouseMove, onMouseLeave };
}
