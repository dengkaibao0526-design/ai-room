export default function IntroModal({ open, researchEnabled, onClose }) {
  if (!open) return null;
  return (
    <div className="chatModalBackdrop">
      <section className="chatModal introCompact" role="dialog" aria-modal="true" aria-labelledby="intro-title">
        <button className="modalClose" type="button" onClick={onClose} aria-label="关闭">×</button>
        <div className="introMark">KB</div><p className="modalEyebrow">XIAOKB · PRIVATE AI ROOM</p>
        <h2 id="intro-title">欢迎来到小KB</h2>
        <p>这是大宝从想法、设计、模型调试到后台运营，一点点搭起来的 AI 空间。你可以轻松聊天，也可以认真处理学习和研究问题。</p>
        <div className="introCapabilities"><span>日常聊天</span>{researchEnabled && <span>学术研究</span>}<span>持续成长</span></div>
        <button className="introEnter" type="button" onClick={onClose}>开始聊天 →</button>
      </section>
    </div>
  );
}
