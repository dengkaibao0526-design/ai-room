import { useEffect, useRef, useState } from "react";

export default function ChatComposer({ value, placeholder, busy, typing, onChange, onSend, onStop }) {
  const textareaRef = useRef(null);
  const [composing, setComposing] = useState(false);

  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "0px";
    node.style.height = `${Math.min(node.scrollHeight, 200)}px`;
  }, [value]);

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey && !composing && !event.nativeEvent.isComposing) {
      event.preventDefault();
      onSend();
    }
  }

  return (
    <footer className="chatComposerDock">
      <div className="chatComposer">
        <textarea
          ref={textareaRef}
          value={value}
          rows={1}
          maxLength={6000}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
          disabled={busy && !typing}
        />
        {busy || typing ? (
          <button className="stopButton" type="button" onClick={onStop}><span />停止</button>
        ) : (
          <button className="sendButton" type="button" onClick={onSend} disabled={!value.trim()}>发送 ↑</button>
        )}
      </div>
      <p>Enter 发送 · Shift + Enter 换行 · AI 可能会犯错，请核对重要信息</p>
    </footer>
  );
}
