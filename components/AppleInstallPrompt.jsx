"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const PROMPT_KEY = "xiaokb_apple_install_prompt_v1";

function isAppleMobileSafari() {
  const ua = navigator.userAgent || "";
  const isAppleMobile = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  return isAppleMobile && isSafari && !isStandalone;
}

export default function AppleInstallPrompt() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (pathname !== "/") return undefined;
    if (!isAppleMobileSafari()) return undefined;
    if (localStorage.getItem(PROMPT_KEY)) return undefined;

    const timer = window.setTimeout(() => setOpen(true), 1200);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  function close() {
    localStorage.setItem(PROMPT_KEY, "dismissed");
    setOpen(false);
  }

  function install() {
    localStorage.setItem(PROMPT_KEY, "opened");
    setOpen(false);
    router.push("/install");
  }

  if (!open) return null;

  return (
    <div className="appleInstallPromptBackdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <section className="appleInstallPrompt" role="dialog" aria-modal="true" aria-label="下载小KB">
        <div className="appleInstallPromptGlow" aria-hidden="true" />
        <div className="appleInstallPromptEyebrow"> 给 iPhone 的朋友</div>
        <strong>小KB可以放到主屏幕了</strong>
        <p>点进去有完整安装教程。不会安装 VPN、证书或设备管理，装好后还是打开 xiaokb.xyz，只是用起来更像 App。</p>
        <div className="appleInstallPromptActions">
          <button className="appleInstallPrimary" type="button" onClick={install}>看看怎么装</button>
          <button className="appleInstallSecondary" type="button" onClick={close}>先不用</button>
        </div>
      </section>
    </div>
  );
}
