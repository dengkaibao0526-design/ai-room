"use client";

import { useEffect, useRef } from "react";

const INTERACTIVE_SELECTOR =
  "a, button, input, textarea, select, summary, [role='button'], [data-cursor-interactive]";

export default function DesktopCursorEffect() {
  const dotRef = useRef(null);
  const glowRef = useRef(null);
  const frameRef = useRef(null);
  const pointerRef = useRef({ x: -100, y: -100 });
  const glowPositionRef = useRef({ x: -100, y: -100 });

  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (!finePointer.matches || reducedMotion.matches) return undefined;

    const dot = dotRef.current;
    const glow = glowRef.current;
    if (!dot || !glow) return undefined;

    const show = () => {
      dot.dataset.visible = "true";
      glow.dataset.visible = "true";
    };

    const hide = () => {
      dot.dataset.visible = "false";
      glow.dataset.visible = "false";
    };

    const setInteractive = (target) => {
      const interactive = target instanceof Element && target.closest(INTERACTIVE_SELECTOR);
      dot.dataset.interactive = interactive ? "true" : "false";
      glow.dataset.interactive = interactive ? "true" : "false";
    };

    const move = (event) => {
      pointerRef.current = { x: event.clientX, y: event.clientY };
      dot.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      setInteractive(event.target);
      show();
    };

    const animateGlow = () => {
      const pointer = pointerRef.current;
      const current = glowPositionRef.current;
      current.x += (pointer.x - current.x) * 0.16;
      current.y += (pointer.y - current.y) * 0.16;
      glow.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`;
      frameRef.current = window.requestAnimationFrame(animateGlow);
    };

    const click = (event) => {
      const ripple = document.createElement("span");
      ripple.className = "desktopCursorRipple";
      ripple.style.left = `${event.clientX}px`;
      ripple.style.top = `${event.clientY}px`;
      document.body.appendChild(ripple);
      ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
    };

    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("mousedown", click, { passive: true });
    document.documentElement.addEventListener("mouseleave", hide);
    document.documentElement.addEventListener("mouseenter", show);
    frameRef.current = window.requestAnimationFrame(animateGlow);

    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mousedown", click);
      document.documentElement.removeEventListener("mouseleave", hide);
      document.documentElement.removeEventListener("mouseenter", show);
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      document.querySelectorAll(".desktopCursorRipple").forEach((node) => node.remove());
    };
  }, []);

  return (
    <>
      <span ref={glowRef} className="desktopCursorGlow" aria-hidden="true" />
      <span ref={dotRef} className="desktopCursorDot" aria-hidden="true" />
      <style jsx global>{`
        .desktopCursorDot,
        .desktopCursorGlow {
          position: fixed;
          top: 0;
          left: 0;
          z-index: 2147483646;
          pointer-events: none;
          opacity: 0;
          will-change: transform, opacity;
        }

        .desktopCursorDot {
          width: 8px;
          height: 8px;
          margin: -4px 0 0 -4px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 0 16px rgba(120, 247, 255, 0.9);
          transition: width 160ms ease, height 160ms ease, margin 160ms ease,
            background 160ms ease, opacity 160ms ease;
        }

        .desktopCursorGlow {
          width: 34px;
          height: 34px;
          margin: -17px 0 0 -17px;
          border: 1px solid rgba(120, 247, 255, 0.58);
          border-radius: 999px;
          background: radial-gradient(
            circle,
            rgba(120, 247, 255, 0.13),
            rgba(120, 247, 255, 0.035) 58%,
            transparent 72%
          );
          box-shadow: 0 0 28px rgba(0, 234, 255, 0.12);
          backdrop-filter: blur(1px);
          transition: width 180ms ease, height 180ms ease, margin 180ms ease,
            border-color 180ms ease, background 180ms ease, opacity 180ms ease;
        }

        .desktopCursorDot[data-visible="true"],
        .desktopCursorGlow[data-visible="true"] {
          opacity: 1;
        }

        .desktopCursorDot[data-interactive="true"] {
          width: 12px;
          height: 12px;
          margin: -6px 0 0 -6px;
          background: rgba(255, 255, 255, 0.72);
        }

        .desktopCursorGlow[data-interactive="true"] {
          width: 52px;
          height: 52px;
          margin: -26px 0 0 -26px;
          border-color: rgba(167, 139, 250, 0.72);
          background: radial-gradient(
            circle,
            rgba(167, 139, 250, 0.14),
            rgba(120, 247, 255, 0.045) 60%,
            transparent 74%
          );
        }

        .desktopCursorRipple {
          position: fixed;
          z-index: 2147483645;
          width: 12px;
          height: 12px;
          margin: -6px 0 0 -6px;
          pointer-events: none;
          border: 1px solid rgba(120, 247, 255, 0.78);
          border-radius: 999px;
          animation: desktopCursorRipple 560ms ease-out forwards;
        }

        @keyframes desktopCursorRipple {
          from {
            opacity: 0.9;
            transform: scale(0.8);
          }
          to {
            opacity: 0;
            transform: scale(4.2);
          }
        }

        @media (pointer: coarse), (prefers-reduced-motion: reduce) {
          .desktopCursorDot,
          .desktopCursorGlow,
          .desktopCursorRipple {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
