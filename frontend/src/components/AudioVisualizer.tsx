"use client";
import { useEffect, useRef } from "react";

interface Props {
  /** "idle" | "listening" | "speaking" | "processing" | "disconnected" */
  state: "idle" | "listening" | "speaking" | "processing" | "disconnected";
}

/**
 * Animated pulsing orb that visually represents the agent's state.
 * - Idle: gentle slow breathe (white)
 * - Listening: medium pulse (blue)
 * - Speaking: fast energetic pulse (green)
 * - Processing: rotating shimmer (amber)
 * - Disconnected: dim static (red)
 */
export default function AudioVisualizer({ state }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 160;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;

    const stateConfig = {
      idle: { color: [245, 245, 245], speed: 0.8, minR: 28, maxR: 34, rings: 2 },
      listening: { color: [59, 130, 246], speed: 1.5, minR: 26, maxR: 40, rings: 3 },
      speaking: { color: [34, 197, 94], speed: 2.5, minR: 24, maxR: 46, rings: 4 },
      processing: { color: [245, 158, 11], speed: 2.0, minR: 25, maxR: 38, rings: 3 },
      disconnected: { color: [239, 68, 68], speed: 0.3, minR: 22, maxR: 25, rings: 1 },
    };

    let t = 0;

    function draw() {
      const cfg = stateConfig[state];
      const [r, g, b] = cfg.color;

      ctx!.clearRect(0, 0, size, size);
      t += cfg.speed * 0.02;

      // Outer rings (glow)
      for (let i = cfg.rings; i >= 0; i--) {
        const phase = t + i * 0.6;
        const pulse = Math.sin(phase) * 0.5 + 0.5;
        const radius = cfg.minR + (cfg.maxR - cfg.minR) * pulse + i * 12;
        const alpha = (0.08 - i * 0.018) * (state === "disconnected" ? 0.5 : 1);

        ctx!.beginPath();
        ctx!.arc(cx, cy, Math.max(radius, 1), 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.max(alpha, 0)})`;
        ctx!.fill();
      }

      // Core orb
      const corePulse = Math.sin(t) * 0.5 + 0.5;
      const coreR = cfg.minR + (cfg.maxR - cfg.minR) * corePulse * 0.5;

      const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.9)`);
      grad.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, 0.4)`);
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx!.beginPath();
      ctx!.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx!.fillStyle = grad;
      ctx!.fill();

      // Inner bright dot
      ctx!.beginPath();
      ctx!.arc(cx, cy, 4 + corePulse * 2, 0, Math.PI * 2);
      ctx!.fillStyle = `rgba(255, 255, 255, ${0.6 + corePulse * 0.4})`;
      ctx!.fill();

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [state]);

  const label =
    state === "listening" ? "Listening for your voice"
    : state === "speaking" ? "Agent is speaking"
    : state === "processing" ? "Processing..."
    : state === "disconnected" ? "Disconnected"
    : "Ready";

  return (
    <div className="flex flex-col items-center gap-2" aria-hidden="true">
      <canvas
        ref={canvasRef}
        className="pointer-events-none"
        aria-label={label}
      />
      <span className="text-xs text-muted-foreground font-medium tracking-wide">
        {label}
      </span>
    </div>
  );
}
