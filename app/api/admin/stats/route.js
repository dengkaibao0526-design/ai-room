const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const VERSION = "admin-stats-v4";

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
  "她们",
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

function safeText(value) {
  if (!value) return "";
  return String(value).trim();
}

function normalizeUserId(value) {
  const text = safeText(value);
  return text || "anonymous";
}

function extractTokens(text) {
  const content = safeText(text);

  if (!content) return [];

  const chineseWords = content.match(/[\u4e00-\u9fa5]{2,6}/g) || [];
  const englishWords = content.match(/[a-zA-Z][a-zA-Z0-9_]{2,20}/g) || [];

  const tokens = [...chineseWords, ...englishWords]
    .map((word) => word.trim())
    .filter((word) => word.length >= 2)
    .filter((word) => !STOP_WORDS.has(word))
    .filter((word) => !/^\d+$/.test(word));

  return tokens;
}

function analyzeKeywords(logs) {
  const counter = new Map();

  logs.forEach((log) => {
    const tokens = extractTokens(log.user_message);

    tokens.forEach((token) => {
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

  if (matched.length === 0) {
    matched.push("其他");
  }

  return matched;
}

function analyzeTopics(logs) {
  const topicCounter = new Map();

  logs.forEach((log) => {
    const topics = detectTopicsForMessage(log.user_message);

    topics.forEach((topic) => {
      topicCounter.set(topic, (topicCounter.get(topic) || 0) + 1);
    });
  });

  return Array.from(topicCounter.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function buildUsers(logs, onlineUsersMap) {
  const userMap = new Map();

  logs.forEach((log) => {
    const userId = normalizeUserId(log.user_id);

    if (!userMap.has(userId)) {
      userMap.set(userId, {
        user_id: userId,
        messageCount: 0,
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

    if (!user.lastMessageAt || new Date(log.created_at) > new Date(user.lastMessageAt)) {
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
        topics: messageTopics,
      });
    }
  });

  onlineUsersMap.forEach((onlineUser, userId) => {
    if (!userMap.has(userId)) {
      userMap.set(userId, {
        user_id: userId,
        messageCount: 0,
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

      return {
        ...user,
        topics: topTopics,
        mainTopic: topTopics[0]?.name || "暂无",
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

async function countRows(table, filters = {}) {
  const params = new URLSearchParams();
  params.set("select", "*");

  Object.entries(filters).forEach(([key, value]) => {
    params.append(key, value);
  });

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
  const params = new URLSearchParams();

  params.set("select", "id,user_id,user_message,ai_reply,created_at");
  params.set("order", "created_at.desc");
  params.set("limit", String(limit));

  const res = await fetch(`${SUPABASE_URL}/rest/v1/chat_logs?${params}`, {
    method: "GET",
    headers: getHeaders(),
    cache: "no-store",
  });

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

    const totalUsers = await countRows("online_users");
    const totalMessages = await countRows("chat_logs");

    const todayMessages = await countRows("chat_logs", {
      created_at: `gte.${startIso}`,
      created_at: `lt.${endIso}`,
    });

    const onlineUsers = await countRows("online_users", {
      last_seen: `gte.${onlineSince}`,
    });

    const todayActiveUsers = await countRows("online_users", {
      last_seen: `gte.${startIso}`,
    });

    const logs = await readRecentLogs(300);
    const onlineUsersMap = await readOnlineUsers();

    const users = buildUsers(logs, onlineUsersMap);
    const keywords = analyzeKeywords(logs);
    const topics = analyzeTopics(logs);

    const recentLogs = logs.slice(0, 100).map((log) => ({
      ...log,
      user_id: normalizeUserId(log.user_id),
      user_message: safeText(log.user_message),
      ai_reply: safeText(log.ai_reply),
      created_at_beijing: toBeijingText(log.created_at),
      topics: detectTopicsForMessage(log.user_message),
    }));

    return Response.json({
      version: VERSION,
      ok: true,
      timezone: "Asia/Shanghai",
      onlineRule: "最近 5 分钟有心跳的用户算在线",
      stats: {
        totalUsers,
        onlineUsers,
        totalMessages,
        todayMessages,
        todayActiveUsers,
        analyzedMessages: logs.length,
      },
      users,
      keywords,
      topics,
      logs: recentLogs,
    });
  } catch (error) {
    console.error("ADMIN_STATS_V4_ERROR:", error);

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
