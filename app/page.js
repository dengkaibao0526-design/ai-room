"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_PUBLIC_SETTINGS = {
  show_mbti: true,
  show_copywriter: true,
  show_feedback: true,
  enable_research_mode: true,
  show_intro_modal: true,
  enable_easter_egg: true,
  enable_chat_logging: true,
};

const STARTER_PROMPTS = {
  daily: [
    "今天有点累，陪我待会儿",
    "随便和我聊两句",
    "我有点烦但说不上来",
    "给我一点精神状态建议",
    "讲个轻松一点的话题",
    "你先问我一个问题",
  ],
  research: [
    "帮我整理这段材料",
    "帮我分析这个问题",
    "把这段话改得更学术",
    "帮我列一个论文思路",
    "解释一个概念给我听",
    "帮我检查逻辑漏洞",
  ],
};

const ROOM_FEATURES = [
  {
    title: "陪你聊",
    desc: "累了、烦了、想随便说两句，都可以。",
  },
  {
    title: "理想法",
    desc: "把卡住的事拆小一点，不急着逼你振作。",
  },
  {
    title: "小工具",
    desc: "MBTI 小测试和文案工作台，想玩再点。",
  },
];

const MODE_DETAIL = {
  daily: {
    status: "日常聊天 · 像朋友一样陪你说话",
    badge: "DAILY ROOM",
    titleTop: "累了就进来",
    titleBottom: "和小KB坐一会儿",
    heroText:
      "可以陪你聊两句，也可以帮你把乱乱的情绪和想法慢慢理清楚。你不用说得很完整，小KB会先听。",
    placeholder: "随便说点什么，小KB在听...",
    starterTitle: "不知道怎么开口？",
    starterHint: "点一句就行",
    modeName: "日常聊天",
    modeDesc: "更快 · 更像朋友",
    tags: ["情绪稳定", "随便聊聊", "长沙夜感", "不催你"],
  },
  research: {
    status: "学术研究 · 更认真地处理问题",
    badge: "RESEARCH MODE",
    titleTop: "把复杂问题",
    titleBottom: "交给小KB拆开",
    heroText:
      "适合整理资料、分析逻辑、润色表达、搭论文框架。更认真一点，但也不冰冷。",
    placeholder: "把问题、材料、作业要求发来...",
    starterTitle: "需要小KB怎么帮你？",
    starterHint: "选一个任务",
    modeName: "学术研究",
    modeDesc: "Pro · 更认真处理",
    tags: ["资料整理", "论文思路", "逻辑分析", "表达润色"],
  },
};

function getTimeGreeting() {
  const hour = new Date().getHours();

  if (hour >= 0 && hour < 5) {
    return "这么晚还没睡啊。没关系，先不用急着解释，慢慢说。";
  }

  if (hour >= 5 && hour < 11) {
    return "早啊。今天刚开始，先让脑子慢慢醒一下。";
  }

  if (hour >= 11 && hour < 18) {
    return "来了。现在这个时间，适合把事情一点点理清楚。";
  }

  if (hour >= 18 && hour < 23) {
    return "晚上好。今天不管过得怎么样，先在这儿坐一会儿。";
  }

  return "这么晚还来找我，今天应该有点事吧。";
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
  const [loadingHint, setLoadingHint] = useState("小KB正在听你说...");
  const [loaded, setLoaded] = useState(false);
  const [userId, setUserId] = useState("");
  const [showStarters, setShowStarters] = useState(true);
  const [chatMode, setChatMode] = useState("daily");
  const [showIntro, setShowIntro] = useState(false);
  const [publicSettings, setPublicSettings] = useState(
    DEFAULT_PUBLIC_SETTINGS
  );

  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState("suggestion");
  const [feedbackContent, setFeedbackContent] = useState("");
  const [feedbackContact, setFeedbackContact] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const bottomRef = useRef(null);
  const typingTimerRef = useRef(null);

  const currentMode =
    chatMode === "research" && publicSettings.enable_research_mode
      ? MODE_DETAIL.research
      : MODE_DETAIL.daily;

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

    return () => {
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
      }
    };
  }, []);

 useEffect(() => {
  async function loadPublicSettings() {
    try {
      const res = await fetch(`/api/settings?t=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({}));

      if (json?.ok && json?.settings) {
        const receivedSettings = Array.isArray(json.settings)
          ? json.settings.reduce((acc, item) => {
              if (item?.key) {
                acc[item.key] = item.value;
              }

              return acc;
            }, {})
          : json.settings;

        const nextSettings = {
          ...DEFAULT_PUBLIC_SETTINGS,
          ...receivedSettings,
        };

        setPublicSettings(nextSettings);

        if (!nextSettings.show_intro_modal) {
          setShowIntro(false);
        }

        if (!nextSettings.show_feedback) {
          setShowFeedback(false);
        }

        if (!nextSettings.enable_research_mode) {
          setChatMode("daily");
          localStorage.setItem("xiaokb_chat_mode", "daily");
        }
      }
    } catch (error) {
      console.error("LOAD_PUBLIC_SETTINGS_ERROR:", error);
    }
  }

  loadPublicSettings();

  function handleFocus() {
    loadPublicSettings();
  }

  function handleVisibilityChange() {
    if (document.visibilityState === "visible") {
      loadPublicSettings();
    }
  }

  window.addEventListener("focus", handleFocus);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    window.removeEventListener("focus", handleFocus);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}, []);

  useEffect(() => {
    if (chatMode === "research" && !publicSettings.enable_research_mode) {
      setChatMode("daily");
      localStorage.setItem("xiaokb_chat_mode", "daily");
      return;
    }

    localStorage.setItem("xiaokb_chat_mode", chatMode);
  }, [chatMode, publicSettings.enable_research_mode]);

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
    if (messages.length > 1) {
      const confirmed = window.confirm(
        "要把这次聊天清空吗？小KB会重新陪你开始。"
      );

      if (!confirmed) return;
    }

    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    localStorage.removeItem("kb-chat");

    setShowStarters(true);
    setLoading(false);
    setLoadingHint("小KB正在听你说...");

    setMessages([
      {
        role: "ai",
        text: "好，记忆清空了。那我们重新开始。我是小KB。",
      },
    ]);
  }

  function handleModeChange(mode) {
    if (loading || mode === chatMode) return;

    if (mode === "research" && !publicSettings.enable_research_mode) {
      return;
    }

    setChatMode(mode);

    if (messages.length <= 1) {
      setShowStarters(true);
    }
  }

  function handleStarterClick(text) {
    if (loading) return;

    setShowStarters(false);
    sendMessage(text);
  }

  function openFeedback() {
    if (!publicSettings.show_feedback) return;

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

    if (!publicSettings.show_feedback) {
      setFeedbackMessage("反馈入口暂时关闭了。");
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

      setFeedbackMessage("收到啦，感谢你给小KB提建议，啊wu呼呼呼咦嘻嘻嘻嘻。");
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

    const finalMode =
      chatMode === "research" && publicSettings.enable_research_mode
        ? "research"
        : "daily";

    setShowStarters(false);
    setMessages(newMessages);
    setInput("");
    setLoadingHint(
      finalMode === "research"
        ? "小KB正在认真拆这个问题..."
        : "小KB正在想怎么接住你这句话..."
    );
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
          mode: finalMode,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "聊天接口请求失败");
      }

      const aiReply = data.reply || "网卡了，重说吧。";

      await typeReply(aiReply);
    } catch (error) {
      console.error("CHAT_ERROR:", error);

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "刚刚网络没接稳，但我还在。你可以把那句话再发我一次。",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function typeReply(fullText) {
    return new Promise((resolve) => {
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
      }

      let index = 0;

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "",
        },
      ]);

      typingTimerRef.current = setInterval(() => {
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
          clearInterval(typingTimerRef.current);
          typingTimerRef.current = null;
          resolve();
        }
      }, 18);
    });
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

      {showIntro && publicSettings.show_intro_modal && (
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
              这是大宝一个人从 2026 年 2 月初开始慢慢搭起来的 AI
              房间。从想法、设计、网站搭建，到模型调试和后台运营，都是一点点摸索出来的。
            </p>

            <p className="introDesc">
              2026 年 5 月 17 日，小KB终于见到了第一个可用模型。它现在还不完美，但已经可以陪你聊天、整理想法，也能认真处理学习和研究问题。
            </p>

            <div className="introFeatureGrid">
              <div className="introFeature">
                <strong>日常聊天</strong>
                <span>轻松一点，像朋友一样陪你说话。</span>
              </div>

              {publicSettings.enable_research_mode && (
                <div className="introFeature">
                  <strong>学术研究</strong>
                  <span>更认真处理资料、作业和思路。</span>
                </div>
              )}

              <div className="introFeature introFeatureWide">
                <strong>持续成长中</strong>
                <span>觉得哪里好用、哪里奇怪，都可以直接反馈给大宝。</span>
              </div>
            </div>

            <button
              type="button"
              className="introButton premiumIntroButton"
              onClick={closeIntro}
            >
              <span>进入房间</span>
              <em>→</em>
            </button>

            <div className="introHint">
              你可以随便说一句开始，不用想好怎么开口。
            </div>
          </div>
        </div>
      )}

      {showFeedback && publicSettings.show_feedback && (
        <div className="feedbackOverlay">
          <div className="feedbackCard">
            <div className="feedbackTop">
              <div>
                <div className="feedbackBadge">FEEDBACK</div>
                <h2>给小KB提点建议</h2>
                <p>哪里不好用、哪里怪、你希望以后有什么功能，都可以写给大宝。</p>
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

      {publicSettings.show_feedback && (
        <button className="floatingFeedback" onClick={openFeedback}>
          反馈
        </button>
      )}

      <section className="phone">
        <header className="chatHeader">
          <div className="avatar">
            <span>KB</span>
          </div>

          <div className="profile">
            <h1>小KB</h1>
            <p>{currentMode.status}</p>
          </div>

          <button className="clearBtn" onClick={clearMemory}>
            重置
          </button>

          <div className="statusDot"></div>
        </header>

        <div className="hero">
          <div className="roomBadge">XIAOKB · {currentMode.badge}</div>

          <h2>
            {currentMode.titleTop}
            <br />
            {currentMode.titleBottom}
          </h2>

          <p className="heroText">{currentMode.heroText}</p>

          <div className="roomFeatureGrid" aria-label="小KB可以陪你做的事">
            {ROOM_FEATURES.map((feature) => (
              <div className="roomFeature" key={feature.title}>
                <strong>{feature.title}</strong>
                <span>{feature.desc}</span>
              </div>
            ))}
          </div>

          {(publicSettings.show_mbti || publicSettings.show_copywriter) && (
            <div className="toolEntryRow">
              {publicSettings.show_mbti && (
                <a className="gameEntryBtn" href="/game/mbti">
                  小KB MBTI 小测试
                </a>
              )}

              {publicSettings.show_copywriter && (
                <a className="gameEntryBtn" href="/tool/copywriter">
                  小KB文案工作台
                </a>
              )}
            </div>
          )}

          <div className="tags">
            {currentMode.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>

          <div className="modePanel">
            <button
              className={`modeBtn ${chatMode === "daily" ? "activeMode" : ""}`}
              onClick={() => handleModeChange("daily")}
              disabled={loading}
            >
              <strong>{MODE_DETAIL.daily.modeName}</strong>
              <span>{MODE_DETAIL.daily.modeDesc}</span>
            </button>

            {publicSettings.enable_research_mode && (
              <button
                className={`modeBtn ${
                  chatMode === "research" ? "activeMode" : ""
                }`}
                onClick={() => handleModeChange("research")}
                disabled={loading}
              >
                <strong>{MODE_DETAIL.research.modeName}</strong>
                <span>{MODE_DETAIL.research.modeDesc}</span>
              </button>
            )}
          </div>

          {showStarters && messages.length <= 1 && (
            <div className="starterPanel">
              <div className="starterTitle">
                <span>{currentMode.starterTitle}</span>
                <em>{currentMode.starterHint}</em>
              </div>

              <div className="starterGrid">
                {STARTER_PROMPTS[
                  chatMode === "research" && publicSettings.enable_research_mode
                    ? "research"
                    : "daily"
                ].map((item) => (
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
              key={`${msg.role}-${index}`}
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
              <div className="bubble aiBubble typingBubble">
                <div className="typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <p>{loadingHint}</p>
              </div>
            </div>
          )}

          <div ref={bottomRef}></div>
        </div>

        <div className="chatInputWrap">
          <div className="inputHint">
            <span>
              {chatMode === "research"
                ? "Pro 模式会更认真一点"
                : "直接说就行，小KB不催你"}
            </span>
          </div>

          <div className="inputBar">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={currentMode.placeholder}
              rows={1}
            />

            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
            >
              {loading ? "..." : "发送"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
