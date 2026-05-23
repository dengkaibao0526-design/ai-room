export const dynamic = "force-dynamic";

const VERSION = "admin-action-v1";

const ALLOWED_ACTIONS = [
  "delete_log",
  "delete_feedback",
  "clear_anonymous_logs",
  "clear_failed_logs",
  "clear_user_logs",
];

function getEnv() {
  return {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    adminPassword: process.env.ADMIN_PASSWORD,
  };
}

function checkPassword(req, bodyPassword) {
  const { adminPassword } = getEnv();

  const headerPassword = req.headers.get("x-admin-password");
  const url = new URL(req.url);
  const queryPassword = url.searchParams.get("password");

  const password = headerPassword || bodyPassword || queryPassword;

  if (!adminPassword) {
    return {
      ok: false,
      status: 500,
      error: "ADMIN_PASSWORD 未配置",
    };
  }

  if (!password || password !== adminPassword) {
    return {
      ok: false,
      status: 401,
      error: "后台密码错误",
    };
  }

  return {
    ok: true,
  };
}

function safeText(value, maxLength = 500) {
  if (!value) return "";
  return String(value).trim().slice(0, maxLength);
}

async function supabaseRequest(path, options = {}) {
  const { supabaseUrl, supabaseKey } = getEnv();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase 环境变量未配置");
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {}),
    },
  });

  const text = await res.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new Error(
      typeof data === "string"
        ? data
        : data?.message || data?.error || `Supabase 请求失败：${res.status}`
    );
  }

  return data;
}

async function deleteChatLogById(id) {
  const safeId = safeText(id, 120);

  if (!safeId) {
    throw new Error("缺少聊天记录 id");
  }

  return supabaseRequest(`chat_logs?id=eq.${encodeURIComponent(safeId)}`, {
    method: "DELETE",
  });
}

async function deleteFeedbackById(id) {
  const safeId = safeText(id, 120);

  if (!safeId) {
    throw new Error("缺少反馈 id");
  }

  return supabaseRequest(`feedbacks?id=eq.${encodeURIComponent(safeId)}`, {
    method: "DELETE",
  });
}

async function clearAnonymousLogs() {
  return supabaseRequest("chat_logs?user_id=eq.anonymous", {
    method: "DELETE",
  });
}

async function clearFailedLogs() {
  return supabaseRequest("chat_logs?success=eq.false", {
    method: "DELETE",
  });
}

async function clearUserLogs(userId) {
  const safeUserId = safeText(userId, 300);

  if (!safeUserId) {
    throw new Error("缺少 user_id");
  }

  if (safeUserId === "all") {
    throw new Error("不能用 all 删除用户记录");
  }

  return supabaseRequest(`chat_logs?user_id=eq.${encodeURIComponent(safeUserId)}`, {
    method: "DELETE",
  });
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));

    const auth = checkPassword(req, body.password);

    if (!auth.ok) {
      return Response.json(
        {
          ok: false,
          version: VERSION,
          error: auth.error,
        },
        { status: auth.status }
      );
    }

    const action = safeText(body.action, 80);

    if (!action) {
      return Response.json(
        {
          ok: false,
          version: VERSION,
          error: "缺少 action",
        },
        { status: 400 }
      );
    }

    if (!ALLOWED_ACTIONS.includes(action)) {
      return Response.json(
        {
          ok: false,
          version: VERSION,
          error: "不允许的操作",
        },
        { status: 400 }
      );
    }

    let result = null;

    if (action === "delete_log") {
      result = await deleteChatLogById(body.id);
    }

    if (action === "delete_feedback") {
      result = await deleteFeedbackById(body.id);
    }

    if (action === "clear_anonymous_logs") {
      result = await clearAnonymousLogs();
    }

    if (action === "clear_failed_logs") {
      result = await clearFailedLogs();
    }

    if (action === "clear_user_logs") {
      result = await clearUserLogs(body.user_id || body.userId);
    }

    return Response.json({
      ok: true,
      version: VERSION,
      action,
      result: Array.isArray(result) ? result : [],
      affected: Array.isArray(result) ? result.length : null,
    });
  } catch (error) {
    console.error("ADMIN_ACTION_ERROR:", error);

    return Response.json(
      {
        ok: false,
        version: VERSION,
        error: "后台操作失败",
        detail: String(error?.message || error),
      },
      { status: 500 }
    );
  }
}
