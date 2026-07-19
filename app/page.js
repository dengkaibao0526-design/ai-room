"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ChatCircleDots,
  ClockCounterClockwise,
  GameController,
  SpeakerHigh,
  SpeakerSlash,
  Sparkle,
} from "@phosphor-icons/react";

export default function EntrancePage() {
  const shellRef = useRef(null);
  const [focus, setFocus] = useState("none");
  const [sound, setSound] = useState(false);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return undefined;

    const onMove = (event) => {
      const x = event.clientX / window.innerWidth - 0.5;
      const y = event.clientY / window.innerHeight - 0.5;
      shell.style.setProperty("--entrance-x", x.toFixed(4));
      shell.style.setProperty("--entrance-y", y.toFixed(4));
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <main ref={shellRef} className="thresholdEntrance" data-focus={focus}>
      <div className="thresholdBackdrop" aria-hidden="true" />
      <div className="thresholdRefraction" aria-hidden="true" />
      <div className="thresholdParticles" aria-hidden="true" />

      <header className="thresholdTopbar">
        <Link href="/" className="thresholdWordmark" aria-label="小KB 首页">
          XIAOKB <span>AI</span>
        </Link>
        <button
          className="thresholdSound"
          type="button"
          aria-label={sound ? "关闭声音" : "开启声音"}
          aria-pressed={sound}
          onClick={() => setSound((value) => !value)}
        >
          {sound ? <SpeakerHigh size={18} weight="duotone" /> : <SpeakerSlash size={18} weight="duotone" />}
          <span>{sound ? "声音已开" : "声音"}</span>
        </button>
      </header>

      <section className="thresholdIntro">
        <p><Sparkle size={14} weight="fill" /> XIAOKB PRIVATE SPACE</p>
        <h1>选择你的空间</h1>
        <span>小KB 将陪伴你的每一次探索</span>
      </section>

      <Link
        href="/chat"
        className="thresholdRealm thresholdChat"
        onPointerEnter={() => setFocus("chat")}
        onPointerLeave={() => setFocus("none")}
        onFocus={() => setFocus("chat")}
        onBlur={() => setFocus("none")}
      >
        <span className="realmIcon"><ChatCircleDots size={42} weight="duotone" /></span>
        <span className="realmCopy">
          <strong>聊天</strong>
          <small>和小KB待一会儿</small>
        </span>
        <span className="realmAction"><em>进入聊天</em><ArrowRight size={20} weight="bold" /></span>
      </Link>

      <Link
        href="/game/zero"
        className="thresholdRealm thresholdGame"
        onPointerEnter={() => setFocus("game")}
        onPointerLeave={() => setFocus("none")}
        onFocus={() => setFocus("game")}
        onBlur={() => setFocus("none")}
      >
        <span className="realmIcon"><GameController size={42} weight="duotone" /></span>
        <span className="realmCopy">
          <strong>游戏</strong>
          <small>进入 KB ZERO</small>
        </span>
        <span className="realmAction"><em>进入游戏</em><ArrowRight size={20} weight="bold" /></span>
      </Link>

      <div className="thresholdCore" aria-hidden="true"><b>KB</b></div>

      <footer className="thresholdFooter">
        <span><ClockCounterClockwise size={16} /> 上次：聊天</span>
        <Link href="/chat">跳过开场 <ArrowRight size={14} /></Link>
      </footer>
    </main>
  );
}
