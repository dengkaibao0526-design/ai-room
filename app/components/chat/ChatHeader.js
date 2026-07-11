import ModeSwitcher from "./ModeSwitcher";

export default function ChatHeader({ mode, settings, busy, onModeChange, onReset, onFeedback }) {
  return (
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
          {settings.show_mbti && <a href="/game/mbti">MBTI</a>}
          {settings.show_copywriter && <a href="/tool/copywriter">文案</a>}
          {settings.show_feedback && <button type="button" onClick={onFeedback}>反馈</button>}
          <button type="button" onClick={onReset}>重置</button>
        </nav>
      </div>
    </header>
  );
}
