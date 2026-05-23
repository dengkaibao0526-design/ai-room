const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export const dynamic = "force-dynamic";

const VERSION = "feedback-status-api-v1";

function getHeaders(extra = {}) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json; charset=utf-8",
    ...extra,
  };
}

function safeText(value, maxLength = 500) {
  if (!value) return "";
  return String(value).trim().slice(0, maxLength);
}

function isValidStatus(status) {
  return ["open", "done", "ignored"].includes(status);
}

export async function POST(req) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return Response.json(
        {
          ok: false,
          version: VERSION,
          error: "Supabase 环境变量没有配置完整",
        },
        { status: 500 }
      );
    }

    if (!ADMIN_PASSWORD) {
      return Response.json(
        {
          ok: false,
          version: VERSION,
          error: "ADMIN_PASSWORD 没有配置",
        },
        { status: 500 }
      );
    }

    const password = req.headers.get("x-admin-password");

    if (password !== ADMIN_PASSWORD) {
      return Response.json(
        {
          ok: false,
          version: VERSION,
          error: "密码错误",
        },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const id = safeText(body.id, 100);
    const status = safeText(body.status, 30);

    if (!id) {
      return Response.json(
        {
          ok: false,
          version: VERSION,
          error: "缺少反馈 ID",
        },
        { status: 400 }
      );
    }

    if (!isValidStatus(status)) {
      return Response.json(
        {
          ok: false,
          version: VERSION,
          error: "反馈状态不合法",
        },
        { status: 400 }
      );
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/feedbacks?id=eq.${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: getHeaders({
          Prefer: "return=representation",
        }),
        body: JSON.stringify({
          status,
        }),
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || "更新反馈状态失败");
    }

    const updated = await res.json().catch(() => []);

    return Response.json({
      ok: true,
      version: VERSION,
      feedback: Array.isArray(updated) ? updated[0] : null,
    });
  } catch (error) {
    console.error("FEEDBACK_STATUS_API_ERROR:", error);

    return Response.json(
      {
        ok: false,
        version: VERSION,
        error: "更新反馈状态失败",
        detail: String(error?.message || error),
      },
      { status: 500 }
    );
  }
}
