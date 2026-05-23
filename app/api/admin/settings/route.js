export const dynamic = "force-dynamic";

const VERSION = "admin-settings-v1";

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
      error: "ADMIN_PASSWORD 未配置",
      status: 500,
    };
  }

  if (!password || password !== adminPassword) {
    return {
      ok: false,
      error: "后台密码错误",
      status: 401,
    };
  }

  return {
    ok: true,
  };
}

function normalizeValue(value) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return value;
}

async function supabaseFetch(path, options = {}) {
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

async function ensureDefaultSettings() {
  const defaults = [
    {
      key: "show_mbti",
      value: true,
      description: "是否显示 MBTI 小测试入口",
    },
    {
      key: "show_copywriter",
      value: true,
      description: "是否显示文案工作台入口",
    },
    {
      key: "show_feedback",
      value: true,
      description: "是否显示反馈按钮",
    },
    {
      key: "enable_research_mode",
      value: true,
      description: "是否开启学术研究模式",
    },
    {
      key: "show_intro_modal",
      value: true,
      description: "是否显示首次进入简介弹窗",
    },
    {
      key: "enable_easter_egg",
      value: true,
      description: "是否开启隐藏彩蛋",
    },
    {
      key: "enable_chat_logging",
      value: true,
      description: "是否记录聊天日志",
    },
  ];

  await supabaseFetch("app_settings?on_conflict=key", {
    method: "POST",
    headers: {
      Prefer: "resolution=ignore-duplicates,return=minimal",
    },
    body: JSON.stringify(defaults),
  });
}

export async function GET(req) {
  try {
    const auth = checkPassword(req);

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

    await ensureDefaultSettings();

    const settings = await supabaseFetch(
      "app_settings?select=key,value,description,updated_at&order=key.asc",
      {
        method: "GET",
      }
    );

    return Response.json({
      ok: true,
      version: VERSION,
      settings: settings || [],
    });
  } catch (error) {
    console.error("ADMIN_SETTINGS_GET_ERROR:", error);

    return Response.json(
      {
        ok: false,
        version: VERSION,
        error: "读取设置失败",
        detail: String(error?.message || error),
      },
      { status: 500 }
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
    const value = normalizeValue(body.value);

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

    const allowKeys = [
      "show_mbti",
      "show_copywriter",
      "show_feedback",
      "enable_research_mode",
      "show_intro_modal",
      "enable_easter_egg",
      "enable_chat_logging",
    ];

    if (!allowKeys.includes(key)) {
      return Response.json(
        {
          ok: false,
          version: VERSION,
          error: "不允许修改这个设置",
        },
        { status: 400 }
      );
    }

    const descriptionMap = {
      show_mbti: "是否显示 MBTI 小测试入口",
      show_copywriter: "是否显示文案工作台入口",
      show_feedback: "是否显示反馈按钮",
      enable_research_mode: "是否开启学术研究模式",
      show_intro_modal: "是否显示首次进入简介弹窗",
      enable_easter_egg: "是否开启隐藏彩蛋",
      enable_chat_logging: "是否记录聊天日志",
    };

    await supabaseFetch("app_settings?on_conflict=key", {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify([
        {
          key,
          value,
          description: descriptionMap[key] || "",
          updated_at: new Date().toISOString(),
        },
      ]),
    });

    const settings = await supabaseFetch(
      "app_settings?select=key,value,description,updated_at&order=key.asc",
      {
        method: "GET",
      }
    );

    return Response.json({
      ok: true,
      version: VERSION,
      key,
      value,
      settings: settings || [],
    });
  } catch (error) {
    console.error("ADMIN_SETTINGS_POST_ERROR:", error);

    return Response.json(
      {
        ok: false,
        version: VERSION,
        error: "更新设置失败",
        detail: String(error?.message || error),
      },
      { status: 500 }
    );
  }
}
