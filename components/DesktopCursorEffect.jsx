"use client";

import { useEffect, useRef } from "react";

const MAGNET_SELECTOR = "button, .chatTools a, .chatBrand";
const CARD_SELECTOR = "[data-spotlight-card]";

export default function DesktopCursorEffect() {
  const frameRef = useRef(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointer.matches || reducedMotion.matches) return undefined;

    const root = document.documentElement;
    const initial = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.28 };
    pointerRef.current = initial;
    currentRef.current = initial;
    root.style.setProperty("--kb-mx", `${initial.x}px`);
    root.style.setProperty("--kb-my", `${initial.y}px`);

    const move = (event) => {
      pointerRef.current = { x: event.clientX, y: event.clientY };

      const card = event.target instanceof Element ? event.target.closest(CARD_SELECTOR) : null;
      if (card) {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--card-x", `${event.clientX - rect.left}px`);
        card.style.setProperty("--card-y", `${event.clientY - rect.top}px`);
      }

      const composer = event.target instanceof Element ? event.target.closest(".chatComposer") : null;
      if (composer) {
        const rect = composer.getBoundingClientRect();
        composer.style.setProperty("--composer-x", `${event.clientX - rect.left}px`);
      }

      const logo = document.querySelector("[data-logo-core]");
      if (logo) {
        const dx = (event.clientX / window.innerWidth - 0.5) * 5;
        const dy = (event.clientY / window.innerHeight - 0.5) * 4;
        logo.style.setProperty("--kb-logo-x", `${dx}px`);
        logo.style.setProperty("--kb-logo-y", `${dy}px`);
      }
    };

    const magneticMove = (event) => {
      const target = event.target instanceof Element ? event.target.closest(MAGNET_SELECTOR) : null;
      if (!target || target.matches(":disabled")) return;
      const rect = target.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      target.style.transform = `translate3d(${dx * 0.04}px, ${dy * 0.04}px, 0)`;
    };

    const magneticLeave = (event) => {
      const target = event.target instanceof Element ? event.target.closest(MAGNET_SELECTOR) : null;
      if (target) target.style.transform = "";
    };

    const animate = () => {
      const target = pointerRef.current;
      const current = currentRef.current;
      current.x += (target.x - current.x) * 0.11;
      current.y += (target.y - current.y) * 0.11;
      root.style.setProperty("--kb-mx", `${current.x}px`);
      root.style.setProperty("--kb-my", `${current.y}px`);
      frameRef.current = window.requestAnimationFrame(animate);
    };

    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointermove", magneticMove, { passive: true });
    document.addEventListener("pointerout", magneticLeave, { passive: true });
    frameRef.current = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointermove", magneticMove);
      document.removeEventListener("pointerout", magneticLeave);
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      root.style.removeProperty("--kb-mx");
      root.style.removeProperty("--kb-my");
    };
  }, []);

  return null;
}
