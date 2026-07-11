"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ChatHeader from "./components/chat/ChatHeader";
import EmptyState from "./components/chat/EmptyState";
import MessageList from "./components/chat/MessageList";
import ChatComposer from "./components/chat/ChatComposer";
import FeedbackModal from "./components/chat/FeedbackModal";
import IntroModal from "./components/chat/IntroModal";
import KBStateCore from "./components/chat/KBStateCore";

const DEFAULT_SETTINGS = {
  show_mbti: true,
  show_copywriter: true,
  show_feedback: true,
  enable_research_mode: true,
  show_intro_modal: true,
  enable_easter_egg: true,
  enable_chat_logging: true,
};

const PROMPTS = {
  daily: ["今天有点累，陪我待会儿", "随便和我聊两句", "我有点烦但说不上来", "你先问我一个问题"],
  research: ["帮我整理这段材料", "帮我分析这个问题", "帮我列一个论文思路", "帮我检查逻辑漏洞"],
};

const MODE = {
  daily: { status: "日常聊天", placeholder: "随便说点什么，小KB在听…" },
  research: { status: "学术研究", placeholder: "把问题、材料或作业要求发来…" },
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "这么晚还没睡啊。没关系，慢慢说。";
  if (hour < 11) return "早啊。今天刚开始，先让脑子慢慢醒一下。";
  if (hour < 18) return "来了。我们把事情一点点理清楚。";
  if (hour < 23) return "晚上好。今天不管过得怎么样，先坐一会儿。";
  return "这么晚还来找我，今天应该有点事吧。";
}

function createUserId() {
  return globalThis.crypto?.randomUUID?.() || `user_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function Home() {
  const [messages, setMessages] = useState([{ role: "ai", text: greeting() }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [userId, setUserId] = useState("");
  const [chatMode, setChatMode] = useState("daily");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [showIntro, setShowIntro] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState("suggestion");
  const [feedbackContent, setFeedbackContent] = useState("");
  const [feedbackContact, setFeedbackContact] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [showJump, setShowJump] = useState(false);
  const [coreListening, setCoreListening] = useState(false);

  const scrollRef = useRef(null);
  const endRef = useRef(null);
  const shouldStickRef = useRef(true);
  const typingTimerRef = useRef(null);
  const typingResolveRef = useRef(null);
  const requestControllerRef = useRef(null);
  const closeFeedbackTimerRef = useRef(null);

  const hasUserMessage = messages.some((message) => message.role === "user");
  const effectiveMode = chatMode === "research" && settings.enable_research_mode ? "research" : "daily";
  const busy = loading || typing;
  const coreState = loading
    ? "thinking"
    : typing
      ? "responding"
      : coreListening
        ? "listening"
        : effectiveMode === "research"
          ? "research"
          : "idle";

  const handleListeningChange = useCallback((active) => {
    setCoreListening(active);
  }, []);

  const scrollToLatest = useCallback((behavior = "smooth") => {
    shouldStickRef.current = true;
    setShowJump(false);
    endRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  useEffect(() => {
    const savedMessages = localStorage.getItem("kb-chat");
    const savedMode = localStorage.getItem("xiaokb_chat_mode");
    const introSeen = localStorage.getItem("xiaokb_intro_seen");
    if (!introSeen) setShowIntro(true);
    if (savedMode === "daily" || savedMode === "research") setChatMode(savedMode);
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        if (Array.isArray(parsed) && parsed.length) setMessages(parsed);
      } catch {
        localStorage.removeItem("kb-chat");
      }
    }
    let id = localStorage.getItem("xiaokb_user_id");
    if (!id) {
      id = createUserId();
      localStorage.setItem("xiaokb_user_id", id);
    }
    setUserId(id);
    setLoaded(true);
    return () => {
      clearInterval(typingTimerRef.current);
      clearTimeout(closeFeedbackTimerRef.current);
      requestControllerRef.current?.abort();
      typingResolveRef.current?.();
    };
  }, []);

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch(`/api/settings?t=${Date.now()}`, { cache: "no-store" });
        const data = await response.json();
        if (!data?.ok || !data.settings) return;
        const next = { ...DEFAULT_SETTINGS, ...data.settings };
        setSettings(next);
        if (!next.show_intro_modal) setShowIntro(false);
        if (!next.show_feedback) setShowFeedback(false);
        if (!next.enable_research_mode) setChatMode("daily");
      } catch (error) {
        console.error("LOAD_PUBLIC_SETTINGS_ERROR:", error);
      }
    }
    loadSettings();
    const onVisible = () => document.visibilityState === "visible" && loadSettings();
    window.addEventListener("focus", loadSettings);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", loadSettings);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem("kb-chat", JSON.stringify(messages));
  }, [loaded, messages]);

  useEffect(() => {
    localStorage.setItem("xiaokb_chat_mode", effectiveMode);
  }, [effectiveMode]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.kbCoreState = coreState;
    root.dataset.kbCoreMode = effectiveMode;
    return () => {
      delete root.dataset.kbCoreState;
      delete root.dataset.kbCoreMode;
    };
  }, [coreState, effectiveMode]);

  useEffect(() => {
    if (!userId) return;
    async function ping() {
      try {
        await fetch("/api/online", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: userId, userId }) });
      } catch (error) {
        console.error("ONLINE_PING_ERROR:", error);
      }
    }
    ping();
    const timer = window.setInterval(ping, 30000);
    return () => window.clearInterval(timer);
  }, [userId]);

  useEffect(() => {
    if (hasUserMessage && shouldStickRef.current) scrollToLatest(typing ? "auto" : "smooth");
  }, [messages, loading, hasUserMessage, scrollToLatest, typing]);

  function onScroll() {
    const node = scrollRef.current;
    if (!node) return;
    const nearBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 100;
    shouldStickRef.current = nearBottom;
    setShowJump(!nearBottom);
  }

  function stopOutput() {
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;
    clearInterval(typingTimerRef.current);
    typingTimerRef.current = null;
    typingResolveRef.current?.();
    typingResolveRef.current = null;
    setLoading(false);
    setTyping(false);
  }

  function typeReply(fullText) {
    setTyping(true);
    return new Promise((resolve) => {
      let index = 0;
      const step = Math.max(2, Math.ceil(fullText.length / 220));
      typingResolveRef.current = resolve;
      setMessages((previous) => [...previous, { role: "ai", text: "" }]);
      typingTimerRef.current = window.setInterval(() => {
        index = Math.min(fullText.length, index + step);
        setMessages((previous) => {
          const next = [...previous];
          next[next.length - 1] = { role: "ai", text: fullText.slice(0, index) };
          return next;
        });
        if (index >= fullText.length) {
          clearInterval(typingTimerRef.current);
          typingTimerRef.current = null;
          typingResolveRef.current = null;
          setTyping(false);
          resolve();
        }
      }, 28);
    });
  }

  async function sendMessage(customText) {
    const userText = (customText ?? input).trim();
    if (!userText || busy) return;
    const history = messages.slice(-40);
    shouldStickRef.current = true;
    setCoreListening(false);
    setMessages((previous) => [...previous, { role: "user", text: userText }]);
    setInput("");
    setLoading(true);
    const controller = new AbortController();
    requestControllerRef.current = controller;
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ message: userText, history, user_id: userId, userId, mode: effectiveMode }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.reply) throw new Error(data.error || "聊天接口请求失败");
      setLoading(false);
      await typeReply(data.reply);
    } catch (error) {
      setLoading(false);
      setTyping(false);
      if (error.name === "AbortError") return;
      setMessages((previous) => [...previous, { role: "ai", text: "这次没有接稳，请检查网络后重试。", error: true, retryText: userText }]);
    } finally {
      requestControllerRef.current = null;
    }
  }

  function resetChat() {
    stopOutput();
    localStorage.removeItem("kb-chat");
    setMessages([{ role: "ai", text: greeting() }]);
    setInput("");
    setCoreListening(false);
  }

  function closeIntro() {
    localStorage.setItem("xiaokb_intro_seen", "true");
    setShowIntro(false);
  }

  async function submitFeedback() {
    if (!feedbackContent.trim() || feedbackLoading) return;
    setFeedbackLoading(true);
    setFeedbackMessage("");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId || "anonymous", userId, type: feedbackType, content: feedbackContent.trim(), contact: feedbackContact, page: "home" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "提交失败");
      setFeedbackMessage("已收到，感谢你的反馈。");
      setFeedbackContent("");
      setFeedbackContact("");
      closeFeedbackTimerRef.current = window.setTimeout(() => setShowFeedback(false), 1000);
    } catch (error) {
      setFeedbackMessage(error.message || "提交失败，请稍后再试。");
    } finally {
      setFeedbackLoading(false);
    }
  }

  return (
    <main className="chatAppShell" data-core-state={coreState} data-core-mode={effectiveMode}>
      <div className="ambientGrid" />
      <ChatHeader mode={effectiveMode} settings={settings} busy={busy} onModeChange={setChatMode} onReset={resetChat} onFeedback={() => setShowFeedback(true)} />
      <section className="chatWorkspace">
        {!hasUserMessage ? (
          <div className="chatScroll emptyScroll">
            <EmptyState mode={effectiveMode} coreState={coreState} prompts={PROMPTS[effectiveMode]} disabled={busy} onPrompt={sendMessage} />
          </div>
        ) : (
          <div className="conversationStage">
            <div className="conversationCoreDock" aria-live="polite">
              <KBStateCore state={coreState} mode={effectiveMode} variant="compact" />
            </div>
            <MessageList messages={messages} loading={loading} scrollRef={scrollRef} endRef={endRef} showJump={showJump} onScroll={onScroll} onJump={() => scrollToLatest()} onRetry={sendMessage} />
          </div>
        )}
        <ChatComposer value={input} placeholder={MODE[effectiveMode].placeholder} busy={loading} typing={typing} onChange={setInput} onSend={() => sendMessage()} onStop={stopOutput} onListeningChange={handleListeningChange} />
      </section>
      <FeedbackModal open={showFeedback && settings.show_feedback} type={feedbackType} content={feedbackContent} contact={feedbackContact} loading={feedbackLoading} message={feedbackMessage} onType={setFeedbackType} onContent={setFeedbackContent} onContact={setFeedbackContact} onClose={() => !feedbackLoading && setShowFeedback(false)} onSubmit={submitFeedback} />
      <IntroModal open={showIntro && settings.show_intro_modal} researchEnabled={settings.enable_research_mode} onClose={closeIntro} />
    </main>
  );
}
