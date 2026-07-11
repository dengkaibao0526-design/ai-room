"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const START_DELAY_MS = 2600;
const LONG_IDLE_MS = 120000;
const RESPONDING_RELEASE_HOLD_MS = 620;

const CHANNELS = {
  core: 0,
  space: 80,
  refraction: 120,
  top: 160,
  composer: 210,
};

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(value) {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
}

function breathingCurve(elapsedMs, research) {
  if (elapsedMs <= 0) return 0;

  const inhale = research ? 3600 : 2800;
  const topHold = research ? 320 : 250;
  const exhale = research ? 5700 : 4700;
  const bottomHold = research ? 780 : 400;
  const cycle = inhale + topHold + exhale + bottomHold;
  const phase = elapsedMs % cycle;

  if (phase < inhale) return smoothstep(phase / inhale);
  if (phase < inhale + topHold) return 1;

  if (phase < inhale + topHold + exhale) {
    const progress = (phase - inhale - topHold) / exhale;
    return 1 - smoothstep(progress);
  }

  return 0;
}

export default function AIBreathEngine() {
  const frameRef = useRef(null);
  const [shell, setShell] = useState(null);

  useEffect(() => {
    setShell(document.querySelector(".chatAppShell"));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mountedAt = performance.now();
    let idleSince = mountedAt;
    let cycleStartedAt = mountedAt + START_DELAY_MS;
    let previousState = root.dataset.kbCoreState || "idle";
    let releaseHoldUntil = cycleStartedAt;
    let wasActive = false;
    let visible = document.visibilityState === "visible";

    const writeValue = (name, value) => {
      root.style.setProperty(`--kb-breath-${name}`, value.toFixed(4));
    };

    const reset = () => {
      Object.keys(CHANNELS).forEach((name) => writeValue(name, 0));
      root.style.setProperty("--kb-breath-presence", "0");
      delete root.dataset.kbBreathing;
      wasActive = false;
    };

    const onVisibility = () => {
      visible = document.visibilityState === "visible";
      if (visible) {
        cycleStartedAt = performance.now();
        idleSince = cycleStartedAt;
      }
    };

    const animate = (now) => {
      if (!visible || reducedMotion.matches) {
        reset();
        frameRef.current = window.requestAnimationFrame(animate);
        return;
      }

      const state = root.dataset.kbCoreState || "idle";
      const research = (root.dataset.kbCoreMode || "daily") === "research";

      if (state !== previousState) {
        if (previousState === "responding" && (state === "idle" || state === "research")) {
          releaseHoldUntil = now + RESPONDING_RELEASE_HOLD_MS;
        }

        if (state !== "idle" && state !== "research") idleSince = now;
        if ((state === "idle" || state === "research") && previousState !== "idle" && previousState !== "research") idleSince = now;
        previousState = state;
      }

      const isBreathingState = state === "idle" || state === "research";
      const initialDelayDone = now - mountedAt >= START_DELAY_MS;
      const releaseReady = now >= releaseHoldUntil;
      const active = isBreathingState && initialDelayDone && releaseReady;

      if (active && !wasActive) cycleStartedAt = now;
      wasActive = active;

      const idleDuration = Math.max(0, now - idleSince);
      const longIdleAttenuation = idleDuration > LONG_IDLE_MS ? 0.62 : 1;
      const modeAmplitude = research ? 0.48 : 1;
      const amplitude = active ? longIdleAttenuation * modeAmplitude : 0;
      const timeline = now - cycleStartedAt;

      Object.entries(CHANNELS).forEach(([name, delay]) => {
        const value = breathingCurve(timeline - delay, research) * amplitude;
        writeValue(name, value);
      });

      root.style.setProperty("--kb-breath-presence", active ? "1" : "0");
      if (active) root.dataset.kbBreathing = research ? "research" : "idle";
      else delete root.dataset.kbBreathing;

      frameRef.current = window.requestAnimationFrame(animate);
    };

    document.addEventListener("visibilitychange", onVisibility);
    frameRef.current = window.requestAnimationFrame(animate);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      reset();
    };
  }, []);

  if (!shell) return null;

  return createPortal(
    <>
      <div className="kbBreathSpace" aria-hidden="true" />
      <div className="kbBreathRefraction" aria-hidden="true" />
      <div className="kbBreathTopLight" aria-hidden="true" />
    </>,
    shell,
  );
}
