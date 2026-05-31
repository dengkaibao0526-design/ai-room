export const dynamic = "force-dynamic";
export const revalidate = 0;

const VERSION = "public-settings-v1";

const DEFAULT_PUBLIC_SETTINGS = {
  show_mbti: true,
  show_copywriter: true,
  show_feedback: true,
  enable_research_mode: true,
  show_intro_modal: true,
  enable_easter_egg: true,
  enable_chat_logging: true,
};

const ALLOW_KEYS = Object.keys(DEFAULT_PUBLIC_SETTINGS);

function normalizeBoolean(value, fallback = true) {
  if (value === true) return true;
  if (value === false) return false;

  if (value === "true") return true;
  if (value === "false") return false;

  if (value === 1) return true;
  if (value === 0) return false;

  if (value === "1") return true;
  if (value === "0") return false;

  if (value && typeof value === "object") {
    if (
      value.value === true ||
      value.value === "true" ||
      value.value === 1 ||
      value.value === "1"
    ) {
      return true;
    }

    if (
      value.value === false ||
      value.value === "false" ||
      value.value === 0 ||
      value.value === "0"
    ) {
      return false;
    }
  }

  return fallback;
}

function getEnv() {
  return {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

async function loadPublicSettings() {
  const { supabaseUrl, supabaseKey } = getEnv();

  if (!supabaseUrl || !supabaseKey) {
    return {
      settings: DEFAULT_PUBLIC_SETTINGS,
      source: "defaults",
    };
  }

  const res = await fetch(
    `${supabaseUrl}/rest/v1/app_settings?select=key,value&order=key.asc`,
    {
      method: "GET",
      cache: "no-store",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    }
  );

  const text = await res.text();

  let rows = [];

  try {
    rows = text ? JSON.parse(text) : [];
  } catch {
    rows = [];
  }

  if (!res.ok) {
    throw new Error(
      Array.isArray(rows)
        ? `Supabase 请求失败：${res.status}`
        : rows?.message || rows?.error || text || `Supabase 请求失败：${res.status}`
    );
  }

  const settings = { ...DEFAULT_PUBLIC_SETTINGS };

  if (Array.isArray(rows)) {
    rows.forEach((item) => {
      if (!ALLOW_KEYS.includes(item?.key)) return;

      settings[item.key] = normalizeBoolean(
        item.value,
        DEFAULT_PUBLIC_SETTINGS[item.key]
      );
    });
  }

  return {
    settings,
    source: "supabase",
  };
}

export async function GET() {
  try {
    const { settings, source } = await loadPublicSettings();

    return Response.json(
      {
        ok: true,
        version: VERSION,
        settings,
        source,
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
        settings: DEFAULT_PUBLIC_SETTINGS,
        source: "fallback",
        warning: "读取设置失败，已使用默认设置",
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
  }
}
