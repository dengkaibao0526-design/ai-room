export const dynamic = "force-dynamic";
export const revalidate = 0;

const VERSION = "public-settings-v1";

const DEFAULT_SETTINGS = {
  show_mbti: true,
  show_copywriter: true,
  show_feedback: true,
  enable_research_mode: true,
  show_intro_modal: true,
  enable_easter_egg: true,
  enable_chat_logging: true,
};

const ALLOW_KEYS = [
  "show_mbti",
  "show_copywriter",
  "show_feedback",
  "enable_research_mode",
  "show_intro_modal",
  "enable_easter_egg",
  "enable_chat_logging",
];

const DESCRIPTION_MAP = {
  show_mbti: "是否显示 MBTI 小测试入口",
  show_copywriter: "是否显示文案工作台入口",
  show_feedback: "是否显示反馈按钮",
  enable_research_mode: "是否开启学术研究模式",
  show_intro_modal: "是否显示首次进入简介弹窗",
  enable_easter_egg: "是否开启隐藏彩蛋",
  enable_chat_logging: "是否记录聊天日志",
};

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

function normalizeBoolean(value) {
  if (value === true) return true;
  if (value === false) return false;

  if (value === "true") return true;
  if (value === "false") return false;

  if (value === 1) return true;
  if (value === 0) return false;

  if (value === "1") return true;
  if (value === "0") return false;

  if (value && typeof value === "object") {
    if (value.value === true || value.value === "true" || value.value === 1 || value.value === "1") {
      return true;
    }

    if (value.value === false || value.value === "false" || value.value === 0 || value.value === "0") {
      return false;
    }
  }

  return Boolean(value);
}

async function supabaseRequest(path, options = {}) {
  const { supabaseUrl, supabaseKey } = getEnv();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase 环境变量未配置");
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
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

async function ensureSettingExists(key, value) {
  await supabaseRequest("app_settings?on_conflict=key", {
    method: "POST",
    headers: {
      Prefer: "resolution=ignore-duplicates,return=minimal",
    },
    body: JSON.stringify([
      {
        key,
        value,
        description: DESCRIPTION_MAP[key] || key,
        updated_at: new Date().toISOString(),
      },
    ]),
  });
}

export async function GET() {
  try {
    const rows = await supabaseRequest(
      "app_settings?select=key,value,updated_at&order=key.asc",
      {
        method: "GET",
      }
    );

    const settings = { ...DEFAULT_SETTINGS };

    for (const row of Array.isArray(rows) ? rows : []) {
      if (ALLOW_KEYS.includes(row?.key)) {
        settings[row.key] = normalizeBoolean(row.value);
      }
    }

    return Response.json(
      {
        ok: true,
        version: VERSION,
        settings,
        generated_at: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("PUBLIC_SETTINGS_GET_ERROR:", error);

    return Response.json(
      {
        ok: true,
        version: VERSION,
        settings: DEFAULT_SETTINGS,
        fallback: true,
        generated_at: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
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

    const key = String(body.key || "").trim();

    if (!key) {
      return Response.json(
        {
          ok: false,
          version: VERSION,
          error: "缺少 key",
        },
        { status: 400 }
      );
    }

    if (!ALLOW_KEYS.includes(key)) {
      return Response.json(
        {
          ok: false,
          version: VERSION,
          error: "不允许修改这个设置",
        },
        { status: 400 }
      );
    }

    const value = normalizeBoolean(body.value);

    await ensureSettingExists(key, value);

    const updatedRows = await supabaseRequest(
      `app_settings?key=eq.${encodeURIComponent(key)}`,
      {
        method: "PATCH",
        headers: {
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          value,
          description: DESCRIPTION_MAP[key] || key,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    const settings = await supabaseRequest(
      "app_settings?select=key,value,description,updated_at&order=key.asc",
      {
        method: "GET",
      }
    );

    return Response.json(
      {
        ok: true,
        version: VERSION,
        key,
        value,
        updated: Array.isArray(updatedRows) ? updatedRows[0] || null : null,
        settings: Array.isArray(settings) ? settings : [],
        generated_at: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("ADMIN_SETTINGS_POST_ERROR:", error);

    return Response.json(
      {
        ok: false,
        version: VERSION,
        error: "更新后台开关失败",
        detail: String(error?.message || error),
      },
      { status: 500 }
    );
  }
}
