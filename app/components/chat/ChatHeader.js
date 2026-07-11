import { useState } from "react";
import ModeSwitcher from "./ModeSwitcher";
import MobileTools from "./MobileTools";

const MEMORY_OPEN_EVENT = "kb-memory-center-open";

export default function ChatHeader({ mode, settings, busy, onModeChange, onReset, onFeedback }) {
  const [toolsOpen, setToolsOpen] = useState(false);

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
            {settings.show_feedback && <button type="button" onClick={onFeedback}>反馈</button>}
            <button type="button" onClick={onReset}>重置</button>
          </nav>

          <button className="mobileToolTrigger" type="button" onClick={() => setToolsOpen(true)} aria-label="打开工具" aria-expanded={toolsOpen}>
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
