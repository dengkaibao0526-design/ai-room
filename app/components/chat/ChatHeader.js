import { useEffect, useState } from "react";
import ModeSwitcher from "./ModeSwitcher";
import MobileTools from "./MobileTools";

const MEMORY_OPEN_EVENT = "kb-memory-center-open";
const ZERO_DISCOVERY_KEY = "xiaokb_zero_discovered_v1";
const ZERO_DISCOVERED_EVENT = "kb-zero-discovered";

export default function ChatHeader({ mode, settings, busy, onModeChange, onReset, onFeedback }) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const [zeroNew, setZeroNew] = useState(false);

  useEffect(() => {
    const syncZeroDiscovery = () => {
      try {
        setZeroNew(localStorage.getItem(ZERO_DISCOVERY_KEY) !== "true");
      } catch {
        setZeroNew(true);
      }
    };

    syncZeroDiscovery();
    window.addEventListener(ZERO_DISCOVERED_EVENT, syncZeroDiscovery);
    return () => window.removeEventListener(ZERO_DISCOVERED_EVENT, syncZeroDiscovery);
  }, []);

  function openMemoryCenter() {
    window.dispatchEvent(new CustomEvent(MEMORY_OPEN_EVENT));
  }

  return (
    <>
      <header className="desktopChatHeader">
        <div className="chatHeaderInner">
          <a className="chatBrand" href="/" aria-label="小KB 首页">
            <span className="chatBrandMark">KB</span>
            <span><strong>小KB</strong><small>在线</small></span>
          </a>

          <ModeSwitcher
            mode={mode}
            enabled={settings.enable_research_mode}
            disabled={busy}
            onChange={onModeChange}
          />

          <nav className="chatTools" aria-label="工具导航">
            <button type="button" onClick={openMemoryCenter}>记忆</button>
            {settings.show_mbti && <a href="/game/mbti">MBTI</a>}
            {settings.show_copywriter && <a href="/tool/copywriter">文案</a>}
            <a className="zeroNavEntry" href="/game/zero" aria-label="进入 KB ZERO Core Combat">
              <span className="zeroNavCore" aria-hidden="true"><i /><i /><i /></span>
              <span className="zeroNavCopy"><strong>KB ZERO</strong><small>CORE COMBAT</small></span>
              <span className="zeroNavLab">LAB</span>
            </a>
            {settings.show_feedback && <button type="button" onClick={onFeedback}>反馈</button>}
            <button type="button" onClick={onReset}>重置</button>
          </nav>

          <button className={`mobileToolTrigger${zeroNew ? " hasZeroDiscovery" : ""}`} type="button" onClick={() => setToolsOpen(true)} aria-label="打开工具" aria-expanded={toolsOpen}>
            <span aria-hidden="true"><i /><i /><i /><i /></span>
          </button>
        </div>
      </header>

      <MobileTools
        open={toolsOpen}
        settings={settings}
        onClose={() => setToolsOpen(false)}
        onFeedback={onFeedback}
        onReset={onReset}
        onMemory={openMemoryCenter}
      />
    </>
  );
}
