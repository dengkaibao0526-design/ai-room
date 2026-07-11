"use client";

import { useEffect, useRef } from "react";

const SENSOR_EVENT = "kb-spatial-sensor-change";
const SENSOR_STORAGE_KEY = "xiaokb_spatial_sensor";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export default function MobileSpatialSensor() {
  const frameRef = useRef(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const enabledRef = useRef(false);

  useEffect(() => {
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!coarsePointer.matches || reducedMotion.matches) return undefined;

    const root = document.documentElement;

    const resetVariables = () => {
      root.style.setProperty("--kb-sensor-x", "0");
      root.style.setProperty("--kb-sensor-y", "0");
      root.style.setProperty("--kb-sensor-xp", "0px");
      root.style.setProperty("--kb-sensor-yp", "0px");
      root.style.setProperty("--kb-sensor-energy", "0");
      root.style.setProperty("--kb-sensor-angle", "0deg");
      delete root.dataset.kbSpatialSensor;
      targetRef.current = { x: 0, y: 0 };
      currentRef.current = { x: 0, y: 0 };
    };

    const onOrientation = (event) => {
      if (!enabledRef.current) return;
      const gamma = typeof event.gamma === "number" ? event.gamma : 0;
      const beta = typeof event.beta === "number" ? event.beta : 0;
      targetRef.current = {
        x: clamp(gamma / 28, -1, 1),
        y: clamp((beta - 42) / 32, -1, 1),
      };
    };

    const setEnabled = (enabled) => {
      if (enabledRef.current === enabled) return;
      enabledRef.current = enabled;
      if (enabled) {
        root.dataset.kbSpatialSensor = "on";
        window.addEventListener("deviceorientation", onOrientation, true);
      } else {
        window.removeEventListener("deviceorientation", onOrientation, true);
        resetVariables();
      }
    };

    const onSensorChange = (event) => setEnabled(Boolean(event.detail?.enabled));

    const animate = () => {
      if (enabledRef.current) {
        const target = targetRef.current;
        const current = currentRef.current;
        current.x += (target.x - current.x) * 0.12;
        current.y += (target.y - current.y) * 0.12;
        const energy = Math.min(1, Math.hypot(current.x, current.y));
        root.style.setProperty("--kb-sensor-x", current.x.toFixed(4));
        root.style.setProperty("--kb-sensor-y", current.y.toFixed(4));
        root.style.setProperty("--kb-sensor-xp", `${(current.x * 54).toFixed(2)}px`);
        root.style.setProperty("--kb-sensor-yp", `${(current.y * 38).toFixed(2)}px`);
        root.style.setProperty("--kb-sensor-energy", energy.toFixed(4));
        root.style.setProperty("--kb-sensor-angle", `${(current.x * 28 - current.y * 18).toFixed(2)}deg`);
      }
      frameRef.current = window.requestAnimationFrame(animate);
    };

    window.addEventListener(SENSOR_EVENT, onSensorChange);
    setEnabled(localStorage.getItem(SENSOR_STORAGE_KEY) === "true");
    frameRef.current = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener(SENSOR_EVENT, onSensorChange);
      window.removeEventListener("deviceorientation", onOrientation, true);
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      resetVariables();
    };
  }, []);

  return null;
}
