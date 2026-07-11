"use client";

import { useEffect, useRef } from "react";

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
  const inhale = research ? 3600 : 2800;
  const topHold = research ? 320 : 250;
  const exhale = research ? 5700 : 4700;
  const bottomHold = research ? 780 : 400;
  const cycle = inhale + topHold + exhale + bottomHold;
  const phase = ((elapsedMs % cycle) + cycle) % cycle;

  if (phase < inhale) {
    return smoothstep(phase / inhale);
  }

  if (phase < inhale + topHold) {
    return 1;
  }

  if (phase < inhale + topHold + exhale) {
    const progress = (phase - inhale - topHold) / exhale;
    return 1 - smoothstep(progress);
  }

  return 0;
}

export default function AIBreathEngine() {
  const frameRef = useRef(null);

  useEffect(() => {
    const root = document.documentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const startedAt = performance.now();
    let idleSince = startedAt;
    let previousState = root.dataset.kbCoreState || "idle";
    let releaseHoldUntil = 0;
    let visible = document.visibilityState === "visible";

    const reset = () => {
      root.style.setProperty("--kb-breath-core", "0");
      root.style.setProperty("--kb-breath-space", "0");
      root.style.setProperty("--kb-breath-refraction", "0");
      root.style.setProperty("--kb-breath-top", "0");
      root.style.setProperty("--kb-breath-composer", "0");
      root.style.setProperty("--kb-breath-presence", "0");
      delete root.dataset.kbBreathing;
    };

    const onVisibility = () => {
      visible = document.visibilityState === "visible";
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
      const initialDelayDone = now - startedAt >= START_DELAY_MS;
      const releaseReady = now >= releaseHoldUntil;
      const active = isBreathingState && initialDelayDone && releaseReady;
      const idleDuration = Math.max(0, now - idleSince);
      const longIdleAttenuation = idleDuration > LONG_IDLE_MS ? 0.62 : 1;
      const modeAmplitude = research ? 0.48 : 1;
      const amplitude = active ? longIdleAttenuation * modeAmplitude : 0;
      const timeline = now - startedAt;

      Object.entries(CHANNELS).forEach(([name, delay]) => {
        const value = breathingCurve(timeline - delay, research) * amplitude;
        root.style.setProperty(`--kb-breath-${name}`, value.toFixed(4));
      });

      const presence = active ? 1 : 0;
      root.style.setProperty("--kb-breath-presence", String(presence));
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

  return null;
}
