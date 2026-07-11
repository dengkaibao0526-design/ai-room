"use client";

import { useEffect, useState } from "react";

export default function ProductEntrance() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) {
      setVisible(false);
      return undefined;
    }

    const timer = window.setTimeout(() => setVisible(false), 1180);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="kbProductEntrance" aria-hidden="true">
      <div className="kbEntranceField" />
      <div className="kbEntranceCore">
        <span className="kbEntranceOrbit one" />
        <span className="kbEntranceOrbit two" />
        <strong>KB</strong>
      </div>
      <div className="kbEntranceLabel">XIAOKB AI</div>
    </div>
  );
}
