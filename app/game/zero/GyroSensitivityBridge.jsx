"use client";

import { useLayoutEffect, useRef, useState } from "react";

const GYRO_SENS_KEY = "xiaokb_zero_gyro_sensitivity_v1";
const DEFAULT_GYRO_SENS = 1;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function loadGyroSens() {
  try {
    const value = Number(localStorage.getItem(GYRO_SENS_KEY));
    return Number.isFinite(value) && value > 0 ? clamp(value, 0.2, 3) : DEFAULT_GYRO_SENS;
  } catch {
    return DEFAULT_GYRO_SENS;
  }
}

export default function GyroSensitivityBridge() {
  const sensRef = useRef(DEFAULT_GYRO_SENS);
  const motionRef = useRef({ lastBeta: null, lastGamma: null, beta: 0, gamma: 0 });
  const [sens, setSens] = useState(DEFAULT_GYRO_SENS);
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);

  useLayoutEffect(() => {
    const saved = loadGyroSens();
    sensRef.current = saved;
    setSens(saved);
    setMobile(matchMedia("(pointer: coarse)").matches || innerWidth < 860);

    function scaleOrientation(event) {
      if (event.__kbZeroGyroScaled) return;
      const beta = Number.isFinite(event.beta) ? event.beta : null;
      const gamma = Number.isFinite(event.gamma) ? event.gamma : null;
      if (beta == null || gamma == null) return;

      event.stopImmediatePropagation();
      const motion = motionRef.current;
      if (motion.lastBeta == null || motion.lastGamma == null) {
        motion.lastBeta = beta;
        motion.lastGamma = gamma;
      } else {
        const dBeta = clamp(beta - motion.lastBeta, -8, 8);
        const dGamma = clamp(gamma - motion.lastGamma, -8, 8);
        motion.beta += dBeta * sensRef.current;
        motion.gamma += dGamma * sensRef.current;
        motion.lastBeta = beta;
        motion.lastGamma = gamma;
      }

      const scaled = new Event("deviceorientation");
      Object.defineProperties(scaled, {
        beta: { value: motion.beta },
        gamma: { value: motion.gamma },
        alpha: { value: Number.isFinite(event.alpha) ? event.alpha : 0 },
        __kbZeroGyroScaled: { value: true },
      });
      window.dispatchEvent(scaled);
    }

    window.addEventListener("deviceorientation", scaleOrientation, true);
    return () => window.removeEventListener("deviceorientation", scaleOrientation, true);
  }, []);

  function update(value) {
    const next = clamp(Number(value), 0.2, 3);
    sensRef.current = next;
    setSens(next);
    try { localStorage.setItem(GYRO_SENS_KEY, String(next)); } catch {}
  }

  if (!mobile) return null;

  return (
    <div style={{ position: "fixed", right: 24, top: 62, zIndex: 30, fontFamily: "Inter,ui-sans-serif,system-ui,-apple-system,sans-serif" }}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        style={{ color: "rgba(235,225,255,.78)", fontSize: 9, letterSpacing: ".08em", backdropFilter: "blur(16px)", background: "rgba(8,6,14,.58)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 999, padding: "7px 10px", cursor: "pointer" }}
      >
        GYRO SENS {sens.toFixed(2)}
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: 38, width: 230, padding: 13, border: "1px solid rgba(218,190,255,.14)", borderRadius: 14, background: "rgba(10,7,17,.94)", backdropFilter: "blur(22px)", boxShadow: "0 20px 60px rgba(0,0,0,.5)" }}>
          <strong style={{ display: "block", marginBottom: 9, fontSize: 11, letterSpacing: ".12em", color: "#eadcff" }}>陀螺仪灵敏度</strong>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 40px", gap: 10, alignItems: "center" }}>
            <input type="range" min="0.2" max="3" step="0.05" value={sens} onChange={(event) => update(event.target.value)} style={{ width: "100%", accentColor: "#a26bff" }} />
            <em style={{ fontStyle: "normal", fontSize: 11, color: "#b997ff", textAlign: "right" }}>{sens.toFixed(2)}</em>
          </div>
          <small style={{ display: "block", marginTop: 8, color: "rgba(213,198,238,.46)", fontSize: 9, lineHeight: 1.5 }}>仅影响 GYRO，不改变触摸视角灵敏度。</small>
        </div>
      )}
    </div>
  );
}
