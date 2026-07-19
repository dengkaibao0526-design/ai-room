"use client";

import { useEffect, useState } from "react";

export default function ProductEntrance() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timer = window.setTimeout(() => setVisible(false), reducedMotion.matches ? 220 : 2350);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="kbProductEntrance kbProductEntranceV2" aria-hidden="true">
      <div className="kbSplashStars" />
      <div className="kbSplashStream left" />
      <div className="kbSplashStream right" />
      <div className="kbEntranceCore"><strong>KB</strong></div>
      <div className="kbSplashFracture" />
      <div className="kbEntranceLabel">XIAOKB AI</div>
    </div>
  );
}
