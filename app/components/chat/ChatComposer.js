import { useEffect, useRef, useState } from "react";

export default function ChatComposer({ value, placeholder, busy, typing, onChange, onSend, onStop, onListeningChange }) {
  const textareaRef = useRef(null);
  const typingPulseTimerRef = useRef(null);
  const typingSettleTimerRef = useRef(null);
  const [composing, setComposing] = useState(false);
  const [typingPhase, setTypingPhase] = useState("idle");

  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "0px";
    node.style.height = `${Math.min(node.scrollHeight, 200)}px`;
  }, [value]);

  useEffect(() => {
    onListeningChange?.(typingPhase === "active");
  }, [typingPhase, onListeningChange]);

  useEffect(() => {
    return () => {
      window.clearTimeout(typingPulseTimerRef.current);
      window.clearTimeout(typingSettleTimerRef.current);
      onListeningChange?.(false);
    };
  }, [onListeningChange]);

  function stopTypingEnergy() {
    window.clearTimeout(typingPulseTimerRef.current);
    window.clearTimeout(typingSettleTimerRef.current);
    setTypingPhase("idle");
  }

  function triggerTypingEnergy(nextValue) {
    onChange(nextValue);
    window.clearTimeout(typingPulseTimerRef.current);
    window.clearTimeout(typingSettleTimerRef.current);

    if (!nextValue) {
      setTypingPhase("idle");
      return;
    }

    setTypingPhase("active");
    typingPulseTimerRef.current = window.setTimeout(() => {
      setTypingPhase("settling");
      typingSettleTimerRef.current = window.setTimeout(() => {
        setTypingPhase("idle");
      }, 760);
    }, 460);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey && !composing && !event.nativeEvent.isComposing) {
      event.preventDefault();
      stopTypingEnergy();
      onSend();
    }
  }

  const composerClassName = typingPhase === "active"
    ? "chatComposer isTypingActive"
    : typingPhase === "settling"
      ? "chatComposer isTypingSettling"
      : "chatComposer";

  return (
    <footer className="chatComposerDock">
      <div className={composerClassName}>
        <span className="typingEnergyRail" aria-hidden="true" />
        <span className="typingEnergyCore" aria-hidden="true" />
        <textarea
          ref={textareaRef}
          value={value}
          rows={1}
          maxLength={6000}
          placeholder={placeholder}
          onChange={(event) => triggerTypingEnergy(event.target.value)}
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
