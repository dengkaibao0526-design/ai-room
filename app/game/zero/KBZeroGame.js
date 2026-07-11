"use client";

import KBZeroGameCore from "./KBZeroGame.jsx";

const PATCH_KEY = "__kbZeroMousePitchFixV1";

function installMousePitchFix() {
  if (typeof window === "undefined" || window[PATCH_KEY]) return;

  const originalAddEventListener = window.addEventListener.bind(window);
  const originalRemoveEventListener = window.removeEventListener.bind(window);
  const wrappedListeners = new WeakMap();

  function shouldWrap(type, listener) {
    if (type !== "mousemove" || typeof listener !== "function") return false;
    const source = Function.prototype.toString.call(listener);
    return source.includes("state.pitch") && source.includes("movementY");
  }

  window.addEventListener = function addEventListenerWithZeroPitchFix(type, listener, options) {
    if (shouldWrap(type, listener)) {
      const wrapped = function zeroMousePitchFixedEvent(event) {
        const fixedEvent = new Proxy(event, {
          get(target, prop) {
            if (prop === "movementY") return -target.movementY;
            const value = target[prop];
            return typeof value === "function" ? value.bind(target) : value;
          },
        });
        return listener.call(this, fixedEvent);
      };

      wrappedListeners.set(listener, wrapped);
      return originalAddEventListener(type, wrapped, options);
    }

    return originalAddEventListener(type, listener, options);
  };

  window.removeEventListener = function removeEventListenerWithZeroPitchFix(type, listener, options) {
    return originalRemoveEventListener(type, wrappedListeners.get(listener) || listener, options);
  };

  window[PATCH_KEY] = true;
}

export default function KBZeroGame() {
  installMousePitchFix();
  return <KBZeroGameCore />;
}
