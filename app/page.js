"use client";

import { useEffect, useRef, useState } from "react";

const STARTER_PROMPTS = [
  "今天有点累",
  "随便陪我聊两句",
  "你是谁",
  "学习压力有点大",
  "没人找我聊天",
  "给我一点建议",
];

function getTimeGreeting() {
  const hour = new Date().getHours();

  if (hour >= 0 && hour < 5) {
    return "还没睡啊？这么晚了，来，慢慢说。";
  }

  if (hour >= 5 && hour < 11) {
    return "早啊，今天醒得还挺早。";
  }

  if (hour >= 11 && hour < 18) {
    return "来了？今天过得怎么样。";
  }

  if (hour >= 18 && hour < 23) {
    return "晚上好，今天累不累？";
  }

  return "这么晚还来找我，今天是不是有点事。";
}

function createUserId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `user_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: getTimeGreeting(),
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [userId, setUserId] = useState("");
  const [showStarters, setShowStarters] = useState(true);

  const bottomRef = useRef(null);

  useEffect(() => {
    const savedMessages = localStorage.getItem("kb-chat");

    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);

        if (Array.isArray(parsedMessages)) {
          setMessages(parsedMessages);

          if (parsedMessages.length > 1) {
            setShowStarters(false);
          }
        }
      } catch (error) {
        console.error("读取本地聊天记录失败：", error);
        localStorage.removeItem("kb-chat");
      }
    }

    setLoaded(true);
  }, []);

  useEffect(() => {
    let id = localStorage.getItem("xiaokb_user_id");

    if (!id) {
      id = createUserId();
      localStorage.setItem("xiaokb_user_id", id);
    }

    setUserId(id);

    async function pingOnline() {
      try {
        await fetch("/api/online", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: id,
            userId: id,
          }),
        });
      } catch (error) {
        console.error("ONLINE_PING_ERROR:", error);
      }
    }

    pingOnline();

    const timer = setInterval(pingOnline, 30 * 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem("kb-chat", JSON.stringify(messages));
    }
  }, [messages, loaded]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function clearMemory() {
    localStorage.removeItem("kb-chat");

    setShowStarters(true);

    setMessages([
      {
        role: "ai",
        text: "好，记忆清空了。那我们重新开始。我是小KB。",
      },
    ]);
  }

  function handleStarterClick(text) {
    if (loading) return;

    setShowStarters(false);
    sendMessage(text);
  }

  async function sendMessage(customText) {
    const finalText = customText || input;

    if (!finalText.trim() || loading) return;

    const userText = finalText.trim();

    const currentUserId =
      userId || localStorage.getItem("xiaokb_user_id") || createUserId();

    if (!localStorage.getItem("xiaokb_user_id")) {
      localStorage.setItem("xiaokb_user_id", currentUserId);
      setUserId(currentUserId);
    }

    const newMessages = [
      ...messages,
      {
        role: "user",
        text: userText,
      },
    ];

    const recentHistory = newMessages.slice(-40);

    setShowStarters(false);
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
          history: recentHistory,
          user_id: currentUserId,
          userId: currentUserId,
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
    }, 24);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <main className="app">
      <div className="ambientGrid"></div>

      <section className="phone">
        <header className="chatHeader">
          <div className="avatar">
            <span>KB</span>
          </div>

          <div className="profile">
            <h1>小KB</h1>
            <p>在线 · 长沙夜里也有人听你说话</p >
          </div>

          <button className="clearBtn" onClick={clearMemory}>
            重置
          </button>

          <div className="statusDot"></div>
        </header>

        <div className="hero">
          <div className="roomBadge">XIAOKB · PRIVATE AI ROOM</div>

          <h2>
            不是普通 AI。
            <br />
            是一个能坐会儿的房间。
          </h2>

          <p className="heroText">
            累了、无聊了、没人说话了，就进来待一会儿。
            不用想好怎么开口，随便一句也行。
          </p >

          <div className="tags">
            <span>长沙夜感</span>
            <span>clean fit</span>
            <span>情绪稳定</span>
            <span>少年感</span>
          </div>

          {showStarters && messages.length <= 1 && (
            <div className="starterPanel">
              <div className="starterTitle">
                <span>不知道说什么？</span>
                <em>点一句开始</em>
              </div>

              <div className="starterGrid">
                {STARTER_PROMPTS.map((item) => (
                  <button
                    key={item}
                    className="starterBtn"
                    onClick={() => handleStarterClick(item)}
                    disabled={loading}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
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
            placeholder="跟小KB说点什么..."
            rows={1}
          />

          <button onClick={() => sendMessage()} disabled={loading || !input.trim()}>
            {loading ? "..." : "发送"}
          </button>
        </div>
      </section>
    </main>
  );
}
