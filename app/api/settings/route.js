export const dynamic = "force-dynamic";

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

const ALLOW_KEYS = Object.keys(DEFAULT_SETTINGS);

function getEnv() {
  return {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

function normalizeValue(value) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return Boolean(value);
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

export async function GET() {
  try {
    const rows = await supabaseRequest(
      `app_settings?select=key,value&key=in.(${ALLOW_KEYS.join(",")})`,
      {
        method: "GET",
      }
    );

    const settings = {
      ...DEFAULT_SETTINGS,
    };

    if (Array.isArray(rows)) {
      rows.forEach((item) => {
        if (ALLOW_KEYS.includes(item.key)) {
          settings[item.key] = normalizeValue(item.value);
        }
      });
    }

    return Response.json({
      ok: true,
      version: VERSION,
      settings,
    });
  } catch (error) {
    console.error("PUBLIC_SETTINGS_ERROR:", error);

    return Response.json({
      ok: true,
      version: VERSION,
      fallback: true,
      settings: DEFAULT_SETTINGS,
      warning: "读取设置失败，已使用默认设置",
    });
  }
}
