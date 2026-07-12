"use client";

import { useLayoutEffect, useRef, useState } from "react";

const GYRO_SENS_KEY = "xiaokb_zero_gyro_sensitivity_v1";
const GYRO_INVERT_YAW_KEY = "xiaokb_zero_gyro_invert_yaw_v1";
const GYRO_INVERT_PITCH_KEY = "xiaokb_zero_gyro_invert_pitch_v1";
const DEFAULT_GYRO_SENS = 1;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const angleDelta = (value, origin) => Math.atan2(Math.sin((value - origin) * Math.PI / 180), Math.cos((value - origin) * Math.PI / 180)) * 180 / Math.PI;

function loadNumber(key, fallback, min, max) {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) ? clamp(value, min, max) : fallback;
  } catch {
    return fallback;
  }
}
function loadBool(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    if (value == null) return fallback;
    return value === "1";
  } catch {
    return fallback;
  }
}
function orientationAngle() {
  const raw = screen.orientation?.angle ?? window.orientation ?? 0;
  return ((raw % 360) + 360) % 360;
}

export default function GyroSensitivityBridge() {
  const sensRef = useRef(DEFAULT_GYRO_SENS);
  const invertYawRef = useRef(false);
  const invertPitchRef = useRef(false);
  const baseRef = useRef(null);
  const syntheticRef = useRef({ beta: 0, gamma: 0 });
  const [sens, setSens] = useState(DEFAULT_GYRO_SENS);
  const [invertYaw, setInvertYaw] = useState(false);
  const [invertPitch, setInvertPitch] = useState(false);
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);

  useLayoutEffect(() => {
    const saved = loadNumber(GYRO_SENS_KEY, DEFAULT_GYRO_SENS, 0.2, 3);
    const savedYaw = loadBool(GYRO_INVERT_YAW_KEY, false);
    const savedPitch = loadBool(GYRO_INVERT_PITCH_KEY, false);
    sensRef.current = saved;
    invertYawRef.current = savedYaw;
    invertPitchRef.current = savedPitch;
    setSens(saved);
    setInvertYaw(savedYaw);
    setInvertPitch(savedPitch);
    setMobile(matchMedia("(pointer: coarse)").matches || innerWidth < 860);

    function scaleOrientation(event) {
      if (event.__kbZeroGyroScaled) return;
      const alpha = Number.isFinite(event.alpha) ? event.alpha : null;
      const beta = Number.isFinite(event.beta) ? event.beta : null;
      const gamma = Number.isFinite(event.gamma) ? event.gamma : null;
      if (beta == null || gamma == null) return;

      event.stopImmediatePropagation();

      if (!baseRef.current) {
        baseRef.current = { alpha: alpha ?? 0, beta, gamma, angle: orientationAngle() };
        syntheticRef.current = { beta: 0, gamma: 0 };
      }

      const base = baseRef.current;
      const angle = orientationAngle();
      const sensValue = sensRef.current;
      const yawSource = alpha == null ? angleDelta(gamma, base.gamma) : angleDelta(alpha, base.alpha);
      const relGamma = angleDelta(gamma, base.gamma);
      const relBeta = angleDelta(beta, base.beta);

      // In landscape, phone tilt-up/down mainly travels on gamma; in portrait it travels on beta.
      let yaw = -yawSource;
      let pitch = relBeta;
      if (angle === 90) pitch = relGamma;
      else if (angle === 270) pitch = -relGamma;

      if (invertYawRef.current) yaw *= -1;
      if (invertPitchRef.current) pitch *= -1;

      yaw = clamp(yaw, -38, 38) * sensValue;
      pitch = clamp(pitch, -30, 30) * sensValue;

      // Existing game handler expects deltas of gamma for yaw and beta for pitch.
      // We feed calibrated synthetic values so current phone posture is always center aim.
      syntheticRef.current = {
        gamma: yaw,
        beta: -pitch,
      };

      const scaled = new Event("deviceorientation");
      Object.defineProperties(scaled, {
        beta: { value: syntheticRef.current.beta },
        gamma: { value: syntheticRef.current.gamma },
        alpha: { value: alpha ?? 0 },
        __kbZeroGyroScaled: { value: true },
      });
      window.dispatchEvent(scaled);
    }

    function recenter() {
      baseRef.current = null;
      syntheticRef.current = { beta: 0, gamma: 0 };
    }

    window.__kbZeroRecenterGyro = recenter;
    window.addEventListener("deviceorientation", scaleOrientation, true);
    window.addEventListener("orientationchange", recenter);
    return () => {
      window.removeEventListener("deviceorientation", scaleOrientation, true);
      window.removeEventListener("orientationchange", recenter);
      if (window.__kbZeroRecenterGyro === recenter) delete window.__kbZeroRecenterGyro;
    };
  }, []);

  function update(value) {
    const next = clamp(Number(value), 0.2, 3);
    sensRef.current = next;
    setSens(next);
    try { localStorage.setItem(GYRO_SENS_KEY, String(next)); } catch {}
  }
  function toggleYaw() {
    const next = !invertYaw;
    invertYawRef.current = next;
    setInvertYaw(next);
    try { localStorage.setItem(GYRO_INVERT_YAW_KEY, next ? "1" : "0"); } catch {}
    window.__kbZeroRecenterGyro?.();
  }
  function togglePitch() {
    const next = !invertPitch;
    invertPitchRef.current = next;
    setInvertPitch(next);
    try { localStorage.setItem(GYRO_INVERT_PITCH_KEY, next ? "1" : "0"); } catch {}
    window.__kbZeroRecenterGyro?.();
  }
  function recenter() {
    window.__kbZeroRecenterGyro?.();
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
        <div style={{ position: "absolute", right: 0, top: 38, width: 246, padding: 13, border: "1px solid rgba(218,190,255,.14)", borderRadius: 14, background: "rgba(10,7,17,.94)", backdropFilter: "blur(22px)", boxShadow: "0 20px 60px rgba(0,0,0,.5)" }}>
          <strong style={{ display: "block", marginBottom: 9, fontSize: 11, letterSpacing: ".12em", color: "#eadcff" }}>陀螺仪灵敏度</strong>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 40px", gap: 10, alignItems: "center" }}>
            <input type="range" min="0.2" max="3" step="0.05" value={sens} onChange={(event) => update(event.target.value)} style={{ width: "100%", accentColor: "#a26bff" }} />
            <em style={{ fontStyle: "normal", fontSize: 11, color: "#b997ff", textAlign: "right" }}>{sens.toFixed(2)}</em>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 10 }}>
            <button type="button" onClick={recenter} style={{ border: "1px solid rgba(255,255,255,.1)", borderRadius: 9, background: "rgba(124,78,220,.18)", color: "#fff", padding: "7px 6px", fontSize: 9 }}>校准</button>
            <button type="button" onClick={toggleYaw} style={{ border: "1px solid rgba(255,255,255,.1)", borderRadius: 9, background: invertYaw ? "rgba(160,95,255,.32)" : "rgba(255,255,255,.06)", color: "#fff", padding: "7px 6px", fontSize: 9 }}>反转左右</button>
            <button type="button" onClick={togglePitch} style={{ border: "1px solid rgba(255,255,255,.1)", borderRadius: 9, background: invertPitch ? "rgba(160,95,255,.32)" : "rgba(255,255,255,.06)", color: "#fff", padding: "7px 6px", fontSize: 9 }}>反转上下</button>
          </div>
          <small style={{ display: "block", marginTop: 8, color: "rgba(213,198,238,.46)", fontSize: 9, lineHeight: 1.5 }}>开启 GYRO 后保持当前握姿，点“校准”把当前方向设为准星中心。</small>
        </div>
      )}
    </div>
  );
}
