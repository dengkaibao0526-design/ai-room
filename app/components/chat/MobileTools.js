import { useEffect } from "react";

export default function MobileTools({ open, settings, onClose, onFeedback, onReset }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="mobileToolBackdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="mobileToolSheet" role="dialog" aria-modal="true" aria-label="小KB 工具">
        <div className="mobileToolSheetHeader">
          <strong>工具</strong>
          <button type="button" onClick={onClose} aria-label="关闭工具">×</button>
        </div>
        <div className="mobileToolGrid">
          {settings.show_copywriter && <a href="/tool/copywriter"><span>文案工作台</span><em>↗</em></a>}
          {settings.show_mbti && <a href="/game/mbti"><span>MBTI</span><em>↗</em></a>}
          {settings.show_feedback && <button type="button" onClick={() => { onClose(); onFeedback(); }}><span>反馈</span><em>＋</em></button>}
          <button type="button" onClick={() => { onClose(); onReset(); }}><span>新对话</span><em>＋</em></button>
        </div>
      </section>
    </div>
  );
}
