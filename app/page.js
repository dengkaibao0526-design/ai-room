"use client";

import { useEffect, useRef, useState } from "react";

const defaultMessages = [
  {
    role: "ai",
    text: "终于来了？我是小KB。今天想跟我说什么？",
  },
];

export default function Home() {
  const [messages, setMessages] = useState(defaultMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    const savedMessages = localStorage.getItem("kb-chat");

    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }

    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem("kb-chat", JSON.stringify(messages));
    }
  }, [messages, loaded]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userText = input.trim();

    const newMessages = [
      ...messages,
      {
        role: "user",
        text: userText,
      },
    ];

    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userText,
          history: newMessages,
        }),
      });

      const data = await res.json();
      const aiReply = data.reply || "网卡了，重说吧。";

      typeReply(aiReply);
    } catch (error) {
      console.error(error);

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "网络好像有点卡，但我还在。",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function typeReply(fullText) {
    let index = 0;

    setMessages((prev) => [
      ...prev,
      {
        role: "ai",
        text: "",
      },
    ]);

    const timer = setInterval(() => {
      index++;

      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: "ai",
          text: fullText.slice(0, index),
        };
        return newMessages;
      });

      if (index >= fullText.length) {
        clearInterval(timer);
      }
    }, 28);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <main className="app">
      <section className="phone">
        <header className="chatHeader">
          <div className="avatar">
            <span>KB</span>
          </div>

          <div className="profile">
            <h1>小KB</h1>
            <p>在线 · 互联网里的另一个 KB</p >
          </div>

          <div className="statusDot"></div>
        </header>

        <div className="hero">
          <div className="roomBadge">KB AVATAR · PRIVATE ROOM</div>

          <h2>
            今晚，
            <br />
            小KB在。
          </h2>

          <p className="heroText">
            不是普通聊天机器人，是一个有少年感、有情绪、有边界感，也会慢慢记住你的 AI 分身。
          </p >

          <div className="tags">
            <span>长沙男高</span>
            <span>clean fit</span>
            <span>情绪稳定</span>
            <span>长期陪伴</span>
          </div>
        </div>

        <div className="messages">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`messageRow ${
                msg.role === "user" ? "userRow" : "aiRow"
              }`}
            >
              <div
                className={`bubble ${
                  msg.role === "user" ? "userBubble" : "aiBubble"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="messageRow aiRow">
              <div className="bubble aiBubble typing">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}

          <div ref={bottomRef}></div>
        </div>

        <div className="inputBar">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="跟我说点什么..."
            rows={1}
          />

          <button onClick={sendMessage} disabled={loading || !input.trim()}>
            {loading ? "..." : "发送"}
          </button>
        </div>
      </section>
    </main>
  );
}
