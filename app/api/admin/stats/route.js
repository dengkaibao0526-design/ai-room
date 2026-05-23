const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const VERSION = "admin-stats-v6-premium";

const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

const STOP_WORDS = new Set([
  "我",
  "你",
  "他",
  "她",
  "它",
  "我们",
  "你们",
  "他们",
  "这个",
  "那个",
  "就是",
  "然后",
  "但是",
  "因为",
  "所以",
  "如果",
  "还是",
  "可以",
  "不是",
  "没有",
  "什么",
  "怎么",
  "为什么",
  "感觉",
  "觉得",
  "真的",
  "有点",
  "一下",
  "一个",
  "现在",
  "今天",
  "明天",
  "昨天",
  "哈哈",
  "哈哈哈",
  "小KB",
  "小kb",
  "KB",
  "AI",
  "ai",
]);

const TOPIC_RULES = [
  {
    name: "情绪陪伴",
    keywords: [
      "累",
      "难受",
      "烦",
      "焦虑",
      "崩溃",
      "emo",
      "孤独",
      "孤单",
      "压力",
      "不开心",
      "失落",
      "委屈",
      "想哭",
      "抑郁",
      "撑不住",
    ],
  },
  {
    name: "学习压力",
    keywords: [
      "学习",
      "作业",
      "考试",
      "成绩",
      "老师",
      "上课",
      "学校",
      "大学",
      "高中",
      "中考",
      "高考",
      "复习",
      "背书",
      "论文",
    ],
  },
  {
    name: "恋爱关系",
    keywords: [
      "喜欢",
      "恋爱",
      "对象",
      "男朋友",
      "女朋友",
      "暧昧",
      "分手",
      "表白",
      "前任",
      "暗恋",
      "吃醋",
      "想他",
      "想她",
    ],
  },
  {
    name: "朋友关系",
    keywords: [
      "朋友",
      "同学",
      "室友",
      "社交",
      "关系",
      "聊天",
      "吵架",
      "冷战",
      "人际",
      "合群",
    ],
  },
  {
    name: "自我成长",
    keywords: [
      "未来",
      "人生",
      "目标",
      "计划",
      "改变",
      "成长",
      "自律",
      "赚钱",
      "工作",
      "创业",
      "方向",
      "迷茫",
    ],
  },
  {
    name: "AI / 产品反馈",
    keywords: [
      "网站",
      "页面",
      "后台",
      "AI",
      "机器人",
      "小KB",
      "功能",
      "bug",
      "卡",
      "回复",
      "聊天记录",
      "记忆",
    ],
  },
  {
    name: "日常闲聊",
    keywords: [
      "吃饭",
      "睡觉",
      "晚安",
      "早安",
      "无聊",
      "游戏",
      "音乐",
      "电影",
      "穿搭",
      "天气",
    ],
  },
];

function getHeaders(extra = {}) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    ...extra,
  };
}

function safeText(value) {
  if (!value) return "";
  return String(value).trim();
}

function normalizeUserId(value) {
  const text = safeText(value);
  return text || "anonymous";
}

function toBeijingText(value) {
  if (!value) return "";

  try {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function getBeijingTodayRange() {
  const now = new Date();
  const beijingNow = new Date(now.getTime() + BEIJING_OFFSET_MS);

  const year = beijingNow.getUTCFullYear();
  const month = beijingNow.getUTCMonth();
  const date = beijingNow.getUTCDate();

  const startUtc = new Date(Date.UTC(year, month, date) - BEIJING_OFFSET_MS);
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);

  return {
    startIso: startUtc.toISOString(),
    endIso: endUtc.toISOString(),
  };
}

function extractTokens(text) {
  const content = safeText(text);

  if (!content) return [];

  const chineseWords = content.match(/[\u4e00-\u9fa5]{2,6}/g) || [];
  const englishWords = content.match(/[a-zA-Z][a-zA-Z0-9_]{2,20}/g) || [];

  return [...chineseWords, ...englishWords]
    .map((word) => word.trim())
    .filter((word) => word.length >= 2)
    .filter((word) => !STOP_WORDS.has(word))
    .filter((word) => !/^\d+$/.test(word));
}

function analyzeKeywords(logs) {
  const counter = new Map();

  logs.forEach((log) => {
    extractTokens(log.user_message).forEach((token) => {
      counter.set(token, (counter.get(token) || 0) + 1);
    });
  });

  return Array.from(counter.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);
}

function detectTopicsForMessage(text) {
  const content = safeText(text);
  const matched = [];

  TOPIC_RULES.forEach((topic) => {
    const hit = topic.keywords.some((keyword) => content.includes(keyword));

    if (hit) {
      matched.push(topic.name);
    }
  });

  return matched.length > 0 ? matched : ["其他"];
}

function analyzeTopics(logs) {
  const topicCounter = new Map();

  logs.forEach((log) => {
    detectTopicsForMessage(log.user_message).forEach((topic) => {
      topicCounter.set(topic, (topicCounter.get(topic) || 0) + 1);
    });
  });

  return Array.from(topicCounter.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function countByField(rows, fieldName, fallback = "unknown") {
  const counter = new Map();

  rows.forEach((row) => {
    const value = safeText(row[fieldName]) || fallback;
    counter.set(value, (counter.get(value) || 0) + 1);
  });

  return Array.from(counter.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function analyzeModes(logs) {
  const daily = logs.filter((log) => log.mode === "daily").length;
  const research = logs.filter((log) => log.mode === "research").length;
  const unknown = logs.filter((log) => !log.mode).length;
  const total = logs.length;

  return {
    total,
    daily,
    research,
    unknown,
    dailyPercent: total ? Math.round((daily / total) * 100) : 0,
    researchPercent: total ? Math.round((research / total) * 100) : 0,
    unknownPercent: total ? Math.round((unknown / total) * 100) : 0,
  };
}

function analyzePerformance(logs) {
  const withLatency = logs
    .map((log) => Number(log.latency_ms))
    .filter((value) => Number.isFinite(value) && value >= 0);

  const successLogs = logs.filter((log) => log.success === true);
  const failedLogs = logs.filter((log) => log.success === false);

  const averageLatency = withLatency.length
    ? Math.round(
        withLatency.reduce((sum, value) => sum + value, 0) / withLatency.length
      )
    : null;

  const maxLatency = withLatency.length ? Math.max(...withLatency) : null;
  const minLatency = withLatency.length ? Math.min(...withLatency) : null;

  return {
    sampleSize: logs.length,
    successCount: successLogs.length,
    failedCount: failedLogs.length,
    successRate: logs.length
      ? Math.round((successLogs.length / logs.length) * 100)
      : 0,
    averageLatency,
    maxLatency,
    minLatency,
  };
}

function buildUsers(logs, onlineUsersMap) {
  const userMap = new Map();

  logs.forEach((log) => {
    const userId = normalizeUserId(log.user_id);

    if (!userMap.has(userId)) {
      userMap.set(userId, {
        user_id: userId,
        messageCount: 0,
        dailyCount: 0,
        researchCount: 0,
        lastMessage: "",
        lastMessageAt: "",
        lastMessageAtBeijing: "",
        lastSeen: "",
        lastSeenBeijing: "",
        online: false,
        topics: {},
        recentMessages: [],
      });
    }

    const user = userMap.get(userId);
    user.messageCount += 1;

    if (log.mode === "daily") {
      user.dailyCount += 1;
    }

    if (log.mode === "research") {
      user.researchCount += 1;
    }

    if (
      !user.lastMessageAt ||
      new Date(log.created_at) > new Date(user.lastMessageAt)
    ) {
      user.lastMessage = safeText(log.user_message);
      user.lastMessageAt = log.created_at || "";
      user.lastMessageAtBeijing = toBeijingText(log.created_at);
    }

    const messageTopics = detectTopicsForMessage(log.user_message);

    messageTopics.forEach((topic) => {
      user.topics[topic] = (user.topics[topic] || 0) + 1;
    });

    if (user.recentMessages.length < 10) {
      user.recentMessages.push({
        id: log.id,
        user_message: safeText(log.user_message),
        ai_reply: safeText(log.ai_reply),
        created_at: log.created_at,
        created_at_beijing: toBeijingText(log.created_at),
        mode: safeText(log.mode || "unknown"),
        model: safeText(log.model || ""),
        latency_ms: log.latency_ms ?? null,
        success: log.success ?? null,
        topics: messageTopics,
      });
    }
  });

  onlineUsersMap.forEach((onlineUser, userId) => {
    if (!userMap.has(userId)) {
      userMap.set(userId, {
        user_id: userId,
        messageCount: 0,
        dailyCount: 0,
        researchCount: 0,
        lastMessage: "",
        lastMessageAt: "",
        lastMessageAtBeijing: "",
        lastSeen: onlineUser.last_seen || "",
        lastSeenBeijing: toBeijingText(onlineUser.last_seen),
        online: onlineUser.online,
        topics: {},
        recentMessages: [],
      });
    } else {
      const user = userMap.get(userId);

      user.lastSeen = onlineUser.last_seen || "";
      user.lastSeenBeijing = toBeijingText(onlineUser.last_seen);
      user.online = onlineUser.online;
    }
  });

  return Array.from(userMap.values())
    .map((user) => {
      const topTopics = Object.entries(user.topics)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      const preferredMode =
        user.researchCount > user.dailyCount
          ? "research"
          : user.dailyCount > 0
          ? "daily"
          : "unknown";

      return {
        ...user,
        topics: topTopics,
        mainTopic: topTopics[0]?.name || "暂无",
        preferredMode,
      };
    })
    .sort((a, b) => {
      if (a.online !== b.online) return a.online ? -1 : 1;

      const aTime = new Date(a.lastSeen || a.lastMessageAt || 0).getTime();
      const bTime = new Date(b.lastSeen || b.lastMessageAt || 0).getTime();

      return bTime - aTime;
    })
    .slice(0, 100);
}

function appendFilterParams(params, filters = []) {
  filters.forEach((filter) => {
    if (!filter || !filter.key || !filter.value) return;
    params.append(filter.key, filter.value);
  });
}

async function countRows(table, filters = []) {
  const params = new URLSearchParams();
  params.set("select", "*");
  appendFilterParams(params, filters);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    method: "HEAD",
    headers: getHeaders({
      Prefer: "count=exact",
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${table} 统计失败：${text}`);
  }

  const contentRange = res.headers.get("content-range") || "0-0/0";
  const totalText = contentRange.split("/")[1];
  const total = Number(totalText);

  return Number.isFinite(total) ? total : 0;
}

async function readRecentLogs(limit = 300) {
  const baseParams = new URLSearchParams();

  baseParams.set(
    "select",
    "id,user_id,user_message,ai_reply,created_at,mode,model,latency_ms,success,error_message"
  );
  baseParams.set("order", "created_at.desc");
  baseParams.set("limit", String(limit));

  let res = await fetch(`${SUPABASE_URL}/rest/v1/chat_logs?${baseParams}`, {
    method: "GET",
    headers: getHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    const fallbackParams = new URLSearchParams();

    fallbackParams.set("select", "id,user_id,user_message,ai_reply,created_at");
    fallbackParams.set("order", "created_at.desc");
    fallbackParams.set("limit", String(limit));

    res = await fetch(`${SUPABASE_URL}/rest/v1/chat_logs?${fallbackParams}`, {
      method: "GET",
      headers: getHeaders(),
      cache: "no-store",
    });
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`读取聊天记录失败：${text}`);
  }

  const json = await res.json();

  return Array.isArray(json) ? json : [];
}

async function readOnlineUsers() {
  const params = new URLSearchParams();

  params.set("select", "user_id,first_seen,last_seen");
  params.set("order", "last_seen.desc");
  params.set("limit", "500");

  const res = await fetch(`${SUPABASE_URL}/rest/v1/online_users?${params}`, {
    method: "GET",
    headers: getHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`读取在线用户失败：${text}`);
  }

  const json = await res.json();
  const list = Array.isArray(json) ? json : [];

  const onlineSinceMs = Date.now() - ONLINE_WINDOW_MS;
  const map = new Map();

  list.forEach((item) => {
    const userId = normalizeUserId(item.user_id);
    const lastSeenTime = new Date(item.last_seen || 0).getTime();

    map.set(userId, {
      user_id: userId,
      first_seen: item.first_seen || "",
      first_seen_beijing: toBeijingText(item.first_seen),
      last_seen: item.last_seen || "",
      last_seen_beijing: toBeijingText(item.last_seen),
      online: Number.isFinite(lastSeenTime) && lastSeenTime >= onlineSinceMs,
    });
  });

  return map;
}

async function readRecentFeedbacks(limit = 50) {
  const baseParams = new URLSearchParams();

  baseParams.set("select", "id,user_id,type,content,contact,page,status,created_at");
  baseParams.set("order", "created_at.desc");
  baseParams.set("limit", String(limit));

  let res = await fetch(`${SUPABASE_URL}/rest/v1/feedbacks?${baseParams}`, {
    method: "GET",
    headers: getHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    const fallbackParams = new URLSearchParams();

    fallbackParams.set("select", "id,user_id,type,content,contact,page,created_at");
    fallbackParams.set("order", "created_at.desc");
    fallbackParams.set("limit", String(limit));

    res = await fetch(`${SUPABASE_URL}/rest/v1/feedbacks?${fallbackParams}`, {
      method: "GET",
      headers: getHeaders(),
      cache: "no-store",
    });
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`读取反馈失败：${text}`);
  }

  const json = await res.json();
  const list = Array.isArray(json) ? json : [];

  return list.map((item) => ({
    id: item.id,
    user_id: normalizeUserId(item.user_id),
    type: safeText(item.type || "suggestion"),
    typeLabel: getFeedbackTypeLabel(item.type),
    content: safeText(item.content),
    contact: safeText(item.contact),
    page: safeText(item.page || "home"),
    status: safeText(item.status || "open"),
    created_at: item.created_at,
    created_at_beijing: toBeijingText(item.created_at),
  }));
}

function getFeedbackTypeLabel(type) {
  if (type === "feature") return "想要的功能";
  if (type === "bug") return "Bug";
  return "建议";
}

function buildRecentLogs(logs) {
  return logs.slice(0, 100).map((log) => ({
    ...log,
    user_id: normalizeUserId(log.user_id),
    user_message: safeText(log.user_message),
    ai_reply: safeText(log.ai_reply),
    created_at_beijing: toBeijingText(log.created_at),
    mode: safeText(log.mode || "unknown"),
    model: safeText(log.model || ""),
    latency_ms: log.latency_ms ?? null,
    success: log.success ?? null,
    error_message: safeText(log.error_message),
    topics: detectTopicsForMessage(log.user_message),
  }));
}

export async function GET(req) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return Response.json(
        {
          version: VERSION,
          ok: false,
          error: "Supabase 环境变量没有配置完整",
        },
        { status: 500 }
      );
    }

    if (!ADMIN_PASSWORD) {
      return Response.json(
        {
          version: VERSION,
          ok: false,
          error: "ADMIN_PASSWORD 没有配置",
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);

    const password =
      req.headers.get("x-admin-password") || searchParams.get("password");

    if (password !== ADMIN_PASSWORD) {
      return Response.json(
        {
          version: VERSION,
          ok: false,
          error: "密码错误",
        },
        { status: 401 }
      );
    }

    const { startIso, endIso } = getBeijingTodayRange();
    const onlineSince = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();

    const [
      totalUsers,
      onlineUsers,
      totalMessages,
      todayMessages,
      todayActiveUsers,
      totalFeedbacks,
      todayFeedbacks,
      logs,
      onlineUsersMap,
      feedbacks,
    ] = await Promise.all([
      countRows("online_users"),
      countRows("online_users", [
        { key: "last_seen", value: `gte.${onlineSince}` },
      ]),
      countRows("chat_logs"),
      countRows("chat_logs", [
        { key: "created_at", value: `gte.${startIso}` },
        { key: "created_at", value: `lt.${endIso}` },
      ]),
      countRows("online_users", [
        { key: "last_seen", value: `gte.${startIso}` },
      ]),
      countRows("feedbacks"),
      countRows("feedbacks", [
        { key: "created_at", value: `gte.${startIso}` },
        { key: "created_at", value: `lt.${endIso}` },
      ]),
      readRecentLogs(300),
      readOnlineUsers(),
      readRecentFeedbacks(50),
    ]);

    const users = buildUsers(logs, onlineUsersMap);
    const keywords = analyzeKeywords(logs);
    const topics = analyzeTopics(logs);
    const modes = analyzeModes(logs);
    const performance = analyzePerformance(logs);
    const models = countByField(logs, "model", "unknown");
    const recentLogs = buildRecentLogs(logs);

    const openFeedbacks = feedbacks.filter(
      (item) => item.status !== "done" && item.status !== "closed"
    ).length;

    return Response.json({
      version: VERSION,
      ok: true,
      timezone: "Asia/Shanghai",
      onlineRule: "最近 5 分钟有心跳的用户算在线",
      generated_at: new Date().toISOString(),
      generated_at_beijing: toBeijingText(new Date().toISOString()),
      stats: {
        totalUsers,
        onlineUsers,
        totalMessages,
        todayMessages,
        todayActiveUsers,
        analyzedMessages: logs.length,
        totalFeedbacks,
        todayFeedbacks,
        openFeedbacks,
      },
      modes,
      models,
      performance,
      users,
      keywords,
      topics,
      feedbacks,
      logs: recentLogs,
    });
  } catch (error) {
    console.error("ADMIN_STATS_V6_ERROR:", error);

    return Response.json(
      {
        version: VERSION,
        ok: false,
        error: "后台接口出错",
        detail: String(error),
      },
      { status: 500 }
    );
  }
}
