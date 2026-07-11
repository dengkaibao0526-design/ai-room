"use client";

import { useEffect } from "react";

export default function NativeShareBridge() {
  useEffect(() => {
    function fillComposer(event) {
      const text = String(event.detail?.text || "").trim();
      if (!text) return;

      const textarea = document.querySelector("textarea");
      if (!textarea) return;

      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        "value",
      )?.set;
      if (!setter) return;

      setter.call(textarea, text);
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.focus({ preventScroll: false });
    }

    window.addEventListener("kb-native-share", fillComposer);
    return () => window.removeEventListener("kb-native-share", fillComposer);
  }, []);

  return null;
}
