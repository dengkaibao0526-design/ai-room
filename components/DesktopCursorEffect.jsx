"use client";

import { useEffect, useRef } from "react";

const MAGNET_SELECTOR = "button, .chatTools a, .chatBrand";
const CARD_SELECTOR = "[data-spotlight-card]";
const FIELD_TARGET_SELECTOR = "[data-logo-core], [data-spotlight-card], .chatComposer";

export default function DesktopCursorEffect() {
  const frameRef = useRef(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const coreRef = useRef({ x: 0, y: 0 });
  const fieldRef = useRef({ x: 0, y: 0 });
  const energyRef = useRef(0);
  const energyTargetRef = useRef(0);

  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointer.matches || reducedMotion.matches) return undefined;

    const root = document.documentElement;
    const initial = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.28 };
    pointerRef.current = initial;
    coreRef.current = initial;
    fieldRef.current = initial;

    const writePosition = (nameX, nameY, point) => {
      root.style.setProperty(nameX, `${point.x}px`);
      root.style.setProperty(nameY, `${point.y}px`);
    };

    writePosition("--kb-mx", "--kb-my", initial);
    writePosition("--kb-fx", "--kb-fy", initial);
    root.style.setProperty("--kb-field-energy", "0");
    root.style.setProperty("--kb-field-angle", "0deg");

    const move = (event) => {
      pointerRef.current = { x: event.clientX, y: event.clientY };

      const element = event.target instanceof Element ? event.target : null;
      const card = element?.closest(CARD_SELECTOR);
      if (card) {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--card-x", `${event.clientX - rect.left}px`);
        card.style.setProperty("--card-y", `${event.clientY - rect.top}px`);
      }

      const composer = element?.closest(".chatComposer");
      if (composer) {
        const rect = composer.getBoundingClientRect();
        composer.style.setProperty("--composer-x", `${event.clientX - rect.left}px`);
      }

      const fieldTarget = element?.closest(FIELD_TARGET_SELECTOR);
      energyTargetRef.current = fieldTarget ? 1 : 0;

      if (fieldTarget) {
        const rect = fieldTarget.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const angle = Math.atan2(event.clientY - cy, event.clientX - cx) * (180 / Math.PI);
        root.style.setProperty("--kb-field-angle", `${angle}deg`);
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
      if (!(event.relatedTarget instanceof Element)?.closest?.(FIELD_TARGET_SELECTOR)) {
        energyTargetRef.current = 0;
      }
    };

    const animate = () => {
      const target = pointerRef.current;
      const core = coreRef.current;
      const field = fieldRef.current;

      core.x += (target.x - core.x) * 0.22;
      core.y += (target.y - core.y) * 0.22;
      field.x += (target.x - field.x) * 0.075;
      field.y += (target.y - field.y) * 0.075;
      energyRef.current += (energyTargetRef.current - energyRef.current) * 0.12;

      writePosition("--kb-mx", "--kb-my", core);
      writePosition("--kb-fx", "--kb-fy", field);
      root.style.setProperty("--kb-field-energy", energyRef.current.toFixed(3));

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
      ["--kb-mx", "--kb-my", "--kb-fx", "--kb-fy", "--kb-field-energy", "--kb-field-angle"].forEach((name) => root.style.removeProperty(name));
    };
  }, []);

  return null;
}
