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
  const [chatMode, setChatMode] = useState("daily");
  const [showIntro, setShowIntro] = useState(false);

  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState("suggestion");
  const [feedbackContent, setFeedbackContent] = useState("");
  const [feedbackContact, setFeedbackContact] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const bottomRef = useRef(null);

  useEffect(() => {
    const savedMessages = localStorage.getItem("kb-chat");
    const savedMode = localStorage.getItem("xiaokb_chat_mode");
    const introSeen = localStorage.getItem("xiaokb_intro_seen");

    if (!introSeen) {
      setShowIntro(true);
    }

    if (savedMode === "daily" || savedMode === "research") {
      setChatMode(savedMode);
    }

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
    localStorage.setItem("xiaokb_chat_mode", chatMode);
  }, [chatMode]);

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

  function closeIntro() {
    localStorage.setItem("xiaokb_intro_seen", "true");
    setShowIntro(false);
  }

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

  function handleModeChange(mode) {
    if (loading) return;
    setChatMode(mode);
  }

  function handleStarterClick(text) {
    if (loading) return;

    setShowStarters(false);
    sendMessage(text);
  }

  function openFeedback() {
    setFeedbackMessage("");
    setShowFeedback(true);
  }

  function closeFeedback() {
    if (feedbackLoading) return;
    setShowFeedback(false);
    setFeedbackMessage("");
  }

  async function submitFeedback() {
    const content = feedbackContent.trim();

    if (!content) {
      setFeedbackMessage("先写点反馈内容吧。");
      return;
    }

    setFeedbackLoading(true);
    setFeedbackMessage("");

    try {
      const currentUserId =
        userId || localStorage.getItem("xiaokb_user_id") || "anonymous";

      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: currentUserId,
          userId: currentUserId,
          type: feedbackType,
          content,
          contact: feedbackContact,
          page: "home",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "提交失败");
      }

      setFeedbackMessage("收到啦，感谢你给小KB提建议。");
      setFeedbackContent("");
      setFeedbackContact("");

      setTimeout(() => {
        setShowFeedback(false);
        setFeedbackMessage("");
      }, 900);
    } catch (error) {
      console.error("SUBMIT_FEEDBACK_ERROR:", error);
      setFeedbackMessage("提交失败了，等下再试一下。");
    } finally {
      setFeedbackLoading(false);
    }
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
          mode: chatMode,
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

      {showIntro && (
        <div className="introOverlay premiumIntro">
          <div className="introGlow introGlowOne"></div>
          <div className="introGlow introGlowTwo"></div>

          <div className="introCard premiumIntroCard">
            <button
              type="button"
              className="introClose"
              onClick={closeIntro}
              aria-label="关闭简介"
            >
              ×
            </button>

            <div className="introTopLine">
              <div className="introBadge">
                <span className="introLiveDot"></span>
                XIAOKB · PRIVATE AI ROOM
              </div>

              <span className="introVersion">v0.1</span>
            </div>

            <div className="introLogo">
              <span>KB</span>
            </div>

            <h1 className="introTitle">
              欢迎来到
              <br />
              小KB房间
            </h1>

            <p className="introDesc">
              这是大宝一个人从 2026 年 2 月初开始慢慢搭起来的 AI 房间。
              从想法、设计、网站搭建，到模型调试和后台运营，都是一点点摸索出来的。
            </p>

            <p className="introDesc">
              2026 年 5 月 17 日，小KB终于见到了第一个可用模型。
              它现在还不完美，但已经可以陪你聊天、整理想法，也能认真处理学习和研究问题。
            </p>

            <div className="introFeatureGrid">
              <div className="introFeature">
                <strong>日常聊天</strong>
                <span>轻松一点，像朋友一样陪你说话。</span>
              </div>

              <div className="introFeature">
                <strong>学术研究</strong>
                <span>更认真处理资料、作业和思路。</span>
              </div>

              <div className="introFeature introFeatureWide">
                <strong>持续成长中</strong>
                <span>
                  觉得哪里好用、哪里奇怪，都可以直接反馈给大宝。
                </span>
              </div>
            </div>

            <button
              type="button"
              className="introButton premiumIntroButton"
              onClick={closeIntro}
            >
              <span>进入小KB房间</span>
              <em>→</em>
            </button>

            <div className="introHint">
              你可以随便说一句开始，不用想好怎么开口。
            </div>
          </div>
        </div>
      )}

      {showFeedback && (
        <div className="feedbackOverlay">
          <div className="feedbackCard">
            <div className="feedbackTop">
              <div>
                <div className="feedbackBadge">FEEDBACK</div>
                <h2>给小KB提点建议</h2>
                <p>
                  哪里不好用、哪里怪、你希望以后有什么功能，都可以写给大宝。
                </p>
              </div>

              <button className="feedbackClose" onClick={closeFeedback}>
                ×
              </button>
            </div>

            <div className="feedbackTypes">
              <button
                className={
                  feedbackType === "suggestion" ? "activeFeedbackType" : ""
                }
                onClick={() => setFeedbackType("suggestion")}
                disabled={feedbackLoading}
              >
                建议
              </button>

              <button
                className={
                  feedbackType === "feature" ? "activeFeedbackType" : ""
                }
                onClick={() => setFeedbackType("feature")}
                disabled={feedbackLoading}
              >
                想要的功能
              </button>

              <button
                className={feedbackType === "bug" ? "activeFeedbackType" : ""}
                onClick={() => setFeedbackType("bug")}
                disabled={feedbackLoading}
              >
                Bug
              </button>
            </div>

            <textarea
              className="feedbackTextarea"
              value={feedbackContent}
              onChange={(e) => setFeedbackContent(e.target.value)}
              placeholder="写点你真实的想法，比如哪里不好用、哪里还可以更好..."
              maxLength={2000}
              disabled={feedbackLoading}
            />

            <input
              className="feedbackInput"
              value={feedbackContact}
              onChange={(e) => setFeedbackContact(e.target.value)}
              placeholder="联系方式，可不填"
              maxLength={200}
              disabled={feedbackLoading}
            />

            <div className="feedbackFooter">
              <span>{feedbackMessage}</span>

              <button
                className="feedbackSubmit"
                onClick={submitFeedback}
                disabled={feedbackLoading}
              >
                {feedbackLoading ? "提交中..." : "提交反馈"}
              </button>
            </div>
          </div>
        </div>
      )}

      <button className="floatingFeedback" onClick={openFeedback}>
        反馈
      </button>

      <section className="phone">
        <header className="chatHeader">
          <div className="avatar">
            <span>KB</span>
          </div>

          <div className="profile">
            <h1>小KB</h1>
            <p>
              {chatMode === "research"
                ? "学术研究 · Pro 模式"
                : "在线 · 长沙夜里也有人听你说话"}
            </p>
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
          </p>

          <div className="tags">
            <span>长沙夜感</span>
            <span>clean fit</span>
            <span>情绪稳定</span>
            <span>少年感</span>
          </div>

          <div className="modePanel">
            <button
              className={`modeBtn ${chatMode === "daily" ? "activeMode" : ""}`}
              onClick={() => handleModeChange("daily")}
              disabled={loading}
            >
              <strong>日常聊天</strong>
              <span>更快 · 更像朋友</span>
            </button>

            <button
              className={`modeBtn ${
                chatMode === "research" ? "activeMode" : ""
              }`}
              onClick={() => handleModeChange("research")}
              disabled={loading}
            >
              <strong>学术研究</strong>
              <span>Pro · 更认真处理</span>
            </button>
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
            placeholder={
              chatMode === "research"
                ? "把问题、材料、作业要求发来..."
                : "跟小KB说点什么..."
            }
            rows={1}
          />

          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
          >
            {loading ? "..." : "发送"}
          </button>
        </div>
      </section>
    </main>
  );
}
