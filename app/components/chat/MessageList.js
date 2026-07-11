import { memo, useState } from "react";

const MessageBubble = memo(function MessageBubble({ message, onRetry }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(message.text || "");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className={`chatMessage ${message.role === "user" ? "isUser" : "isAi"}`}>
      {message.role !== "user" && <div className="messageAvatar">KB</div>}
      <div className="messageContent">
        <div className={`messageBubble ${message.error ? "hasError" : ""}`}>{message.text}</div>
        {message.role !== "user" && message.text && (
          <div className="messageActions">
            <button type="button" onClick={copy}>{copied ? "已复制" : "复制"}</button>
            {message.retryText && <button type="button" onClick={() => onRetry(message.retryText)}>重试</button>}
          </div>
        )}
      </div>
    </article>
  );
});

export default function MessageList({ messages, loading, scrollRef, endRef, showJump, onScroll, onJump, onRetry }) {
  return (
    <div className="chatScroll" ref={scrollRef} onScroll={onScroll}>
      <div className="chatMessageColumn">
        {messages.map((message, index) => (
          <MessageBubble key={`${message.role}-${index}`} message={message} onRetry={onRetry} />
        ))}
        {loading && (
          <article className="chatMessage isAi">
            <div className="messageAvatar">KB</div>
            <div className="messageBubble typingIndicator"><i /><i /><i /></div>
          </article>
        )}
        <div ref={endRef} />
      </div>
      {showJump && <button className="jumpLatest" type="button" onClick={onJump}>回到最新消息 ↓</button>}
    </div>
  );
}
