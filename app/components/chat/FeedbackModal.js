export default function FeedbackModal({ open, type, content, contact, loading, message, onType, onContent, onContact, onClose, onSubmit }) {
  if (!open) return null;
  return (
    <div className="chatModalBackdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="chatModal" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
        <button className="modalClose" type="button" onClick={onClose} aria-label="关闭">×</button>
        <p className="modalEyebrow">FEEDBACK</p><h2 id="feedback-title">给小KB提点建议</h2>
        <p>哪里不好用、哪里奇怪，或者你想要什么功能，都可以直接写下来。</p>
        <div className="modalSegments">
          {[['suggestion','建议'],['feature','想要的功能'],['bug','Bug']].map(([key,label]) => (
            <button type="button" key={key} className={type === key ? "isActive" : ""} onClick={() => onType(key)} disabled={loading}>{label}</button>
          ))}
        </div>
        <textarea value={content} onChange={(e) => onContent(e.target.value)} maxLength={2000} placeholder="写下你的真实想法…" disabled={loading} />
        <input value={contact} onChange={(e) => onContact(e.target.value)} maxLength={200} placeholder="联系方式（选填）" disabled={loading} />
        <div className="modalFooter"><span>{message}</span><button type="button" onClick={onSubmit} disabled={loading || !content.trim()}>{loading ? "提交中…" : "提交反馈"}</button></div>
      </section>
    </div>
  );
}
