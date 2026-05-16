"use client";

import { useState } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "我是你的 AI 分身。你可以和我聊天。"
    }
  ]);

  const sendMessage = async () => {
    if (!input) return;

    const userMessage = {
      role: "user",
      content: input
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: newMessages
      })
    });

    const data = await res.json();

    setMessages([
      ...newMessages,
      {
        role: "assistant",
        content: data.reply
      }
    ]);
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050816",
        color: "white",
        padding: 20
      }}
    >
      <h1
        style={{
          fontSize: 40,
          marginBottom: 30
        }}
      >
        AI AVATAR / 分身对话
      </h1>

      <div
        style={{
          maxWidth: 700,
          margin: "0 auto"
        }}
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              background:
                msg.role === "user"
                  ? "#6d28d9"
                  : "#0f172a",
              padding: 16,
              borderRadius: 12,
              marginBottom: 12
            }}
          >
            {msg.content}
          </div>
        ))}

        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 20
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入你想说的话..."
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 10,
              border: "none",
              fontSize: 16
            }}
          />

          <button
            onClick={sendMessage}
            style={{
              padding: "14px 24px",
              borderRadius: 10,
              border: "none",
              background: "#8b5cf6",
              color: "white",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            发送
          </button>
        </div>
      </div>
    </main>
  );
}
