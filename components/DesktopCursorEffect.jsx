"use client";

import { useEffect, useRef } from "react";

const MAGNET_SELECTOR = "button, a, [data-logo-core], [data-spotlight-card], .chatComposer";

export default function DesktopCursorEffect() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!canvas || !finePointer.matches || reducedMotion.matches) return undefined;

    const context = canvas.getContext("2d", { alpha: true });
    const root = document.documentElement;
    const pointer = { x: innerWidth / 2, y: innerHeight / 2, px: innerWidth / 2, py: innerHeight / 2 };
    const trail = [];
    let frame = 0;
    let strength = 1;
    let targetStrength = 1;

    const resize = () => {
      const ratio = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(innerWidth * ratio);
      canvas.height = Math.round(innerHeight * ratio);
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const onMove = (event) => {
      pointer.px = pointer.x;
      pointer.py = pointer.y;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      root.style.setProperty("--kb-mx", `${pointer.x}px`);
      root.style.setProperty("--kb-my", `${pointer.y}px`);

      const target = event.target instanceof Element ? event.target.closest(MAGNET_SELECTOR) : null;
      if (target && !target.matches(":disabled")) {
        const rect = target.getBoundingClientRect();
        const dx = event.clientX - rect.left - rect.width / 2;
        const dy = event.clientY - rect.top - rect.height / 2;
        target.style.setProperty("--magnet-x", `${dx * 0.055}px`);
        target.style.setProperty("--magnet-y", `${dy * 0.055}px`);
      }
    };

    const onOut = (event) => {
      const target = event.target instanceof Element ? event.target.closest(MAGNET_SELECTOR) : null;
      if (target) {
        target.style.removeProperty("--magnet-x");
        target.style.removeProperty("--magnet-y");
      }
    };

    const animate = () => {
      const shell = document.querySelector(".chatAppShell");
      const state = shell?.dataset.coreState;
      targetStrength = state === "thinking" || state === "responding" || state === "listening" ? 0.16 : 1;
      strength += (targetStrength - strength) * 0.075;
      root.style.setProperty("--kb-cursor-strength", strength.toFixed(3));

      const speed = Math.hypot(pointer.x - pointer.px, pointer.y - pointer.py);
      if (speed > 0.35 && trail.length < 70) {
        trail.push({
          x: pointer.x + (Math.random() - 0.5) * 8,
          y: pointer.y + (Math.random() - 0.5) * 8,
          vx: (pointer.x - pointer.px) * -0.025 + (Math.random() - 0.5) * 0.45,
          vy: (pointer.y - pointer.py) * -0.025 + (Math.random() - 0.5) * 0.45,
          life: 1,
          size: 0.8 + Math.random() * 2.1,
          blue: pointer.x > innerWidth / 2,
        });
      }
      pointer.px += (pointer.x - pointer.px) * 0.75;
      pointer.py += (pointer.y - pointer.py) * 0.75;

      context.clearRect(0, 0, innerWidth, innerHeight);
      context.globalCompositeOperation = "lighter";
      trail.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.985;
        particle.vy *= 0.985;
        particle.life -= 0.018 + (1 - strength) * 0.035;
        const alpha = Math.max(0, particle.life) * strength;
        context.beginPath();
        context.fillStyle = particle.blue ? `rgba(82,130,255,${alpha})` : `rgba(187,105,255,${alpha})`;
        context.shadowBlur = 15 * strength;
        context.shadowColor = particle.blue ? "#3977ff" : "#b86cff";
        context.arc(particle.x, particle.y, particle.size * strength, 0, Math.PI * 2);
        context.fill();
      });
      for (let index = trail.length - 1; index >= 0; index -= 1) {
        if (trail[index].life <= 0) trail.splice(index, 1);
      }

      const glow = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 42 * strength);
      glow.addColorStop(0, `rgba(235,220,255,${0.3 * strength})`);
      glow.addColorStop(0.18, `rgba(${pointer.x > innerWidth / 2 ? "75,120,255" : "174,90,255"},${0.22 * strength})`);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = glow;
      context.fillRect(pointer.x - 48, pointer.y - 48, 96, 96);

      frame = requestAnimationFrame(animate);
    };

    resize();
    addEventListener("resize", resize, { passive: true });
    addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onOut, { passive: true });
    frame = requestAnimationFrame(animate);

    return () => {
      removeEventListener("resize", resize);
      removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onOut);
      cancelAnimationFrame(frame);
      root.style.removeProperty("--kb-cursor-strength");
    };
  }, []);

  return <canvas ref={canvasRef} className="kbCursorCanvas" aria-hidden="true" />;
}
