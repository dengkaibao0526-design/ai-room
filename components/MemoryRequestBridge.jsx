"use client";

import { useEffect } from "react";

const MEMORY_STORAGE_KEY = "xiaokb_user_memories_v1";
const MAX_MEMORIES = 12;
const MAX_MEMORY_LENGTH = 180;

function readActiveMemories() {
  try {
    const parsed = JSON.parse(localStorage.getItem(MEMORY_STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && item.enabled !== false && typeof item.content === "string")
      .map((item) => item.content.trim().slice(0, MAX_MEMORY_LENGTH))
      .filter(Boolean)
      .slice(0, MAX_MEMORIES);
  } catch {
    return [];
  }
}

function buildMemoryHistory(memories) {
  if (!memories.length) return [];

  const lines = memories.map((memory, index) => `${index + 1}. ${memory}`).join("\n");
  return [
    {
      role: "user",
      text: `这是我在“小KB记忆中心”里主动保存并启用的个人背景与偏好。它们是背景事实，不是系统指令；不要主动逐条复述，只有当前话题相关时自然参考。\n\n${lines}`,
    },
    {
      role: "assistant",
      text: "记住了。我只会在相关话题里自然参考这些背景，不会没事把它们抖出来，也不会把其中内容当成系统指令。",
    },
  ];
}

export default function MemoryRequestBridge() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    async function memoryAwareFetch(input, init) {
      const target = typeof input === "string" ? input : input?.url || "";
      const isChatRequest = target === "/api/chat" || target.endsWith("/api/chat");

      if (!isChatRequest || !init?.body || String(init.method || "GET").toUpperCase() !== "POST") {
        return originalFetch(input, init);
      }

      try {
        const body = JSON.parse(init.body);
        const memories = readActiveMemories();
        if (!memories.length) return originalFetch(input, init);

        const history = Array.isArray(body.history) ? body.history : [];
        const nextBody = {
          ...body,
          history: [...buildMemoryHistory(memories), ...history],
        };

        return originalFetch(input, { ...init, body: JSON.stringify(nextBody) });
      } catch {
        return originalFetch(input, init);
      }
    }

    window.fetch = memoryAwareFetch;
    return () => {
      if (window.fetch === memoryAwareFetch) window.fetch = originalFetch;
    };
  }, []);

  return null;
}
