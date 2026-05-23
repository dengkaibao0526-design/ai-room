export const dynamic = "force-dynamic";

const VERSION = "admin-settings-simple-v1";

const ALLOW_KEYS = [
  "show_mbti",
  "show_copywriter",
  "show_feedback",
  "enable_research_mode",
  "show_intro_modal",
  "enable_easter_egg",
  "enable_chat_logging",
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

function normalizeValue(value) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return value;
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

    const settings = await supabaseRequest(
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
        error: "读取后台开关失败",
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

    await supabaseRequest(`app_settings?key=eq.${encodeURIComponent(key)}`, {
      method: "PATCH",
      headers: {
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        value,
        updated_at: new Date().toISOString(),
      }),
    });

    const settings = await supabaseRequest(
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
        error: "更新后台开关失败",
        detail: String(error?.message || error),
      },
      { status: 500 }
    );
  }
}
