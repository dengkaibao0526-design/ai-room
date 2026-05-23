export const dynamic = "force-dynamic";
export const revalidate = 0;

const VERSION = "public-settings-v2-debug";

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

function normalizeValue(value) {
  if (value === true) return true;
  if (value === false) return false;
  if (value === "true") return true;
  if (value === "false") return false;

  if (value && typeof value === "object") {
    if (value.value === true) return true;
    if (value.value === false) return false;
    if (value.value === "true") return true;
    if (value.value === "false") return false;
  }

  return Boolean(value);
}

async function supabaseRequest(path) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase 环境变量未配置");
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method: "GET",
    cache: "no-store",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
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
      `app_settings?select=key,value,description,updated_at&key=in.(${ALLOW_KEYS.join(
        ","
      )})&order=key.asc`
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

    return Response.json(
      {
        ok: true,
        version: VERSION,
        settings,
        raw: rows || [],
        generated_at: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("PUBLIC_SETTINGS_ERROR:", error);

    return Response.json(
      {
        ok: true,
        version: VERSION,
        fallback: true,
        settings: DEFAULT_SETTINGS,
        raw: [],
        warning: "读取设置失败，已使用默认设置",
        detail: String(error?.message || error),
        generated_at: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  }
}
