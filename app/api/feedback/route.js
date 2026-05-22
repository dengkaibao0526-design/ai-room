const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function safeText(value, maxLength = 2000) {
  if (!value) return "";
  return String(value).trim().slice(0, maxLength);
}

export async function POST(req) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return Response.json(
        {
          ok: false,
          error: "Supabase 环境变量没有配置完整",
        },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const user_id = safeText(body.user_id || body.userId || "anonymous", 100);
    const type = safeText(body.type || "suggestion", 50);
    const content = safeText(body.content, 2000);
    const contact = safeText(body.contact, 200);
    const page = safeText(body.page || "home", 100);

    if (!content) {
      return Response.json(
        {
          ok: false,
          error: "反馈内容不能为空",
        },
        { status: 400 }
      );
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/feedbacks`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json; charset=utf-8",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        user_id,
        type,
        content,
        contact,
        page,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");

      return Response.json(
        {
          ok: false,
          error: "反馈保存失败",
          detail: text,
        },
        { status: 500 }
      );
    }

    return Response.json({
      ok: true,
      message: "反馈已收到",
    });
  } catch (error) {
    console.error("FEEDBACK_API_ERROR:", error);

    return Response.json(
      {
        ok: false,
        error: "反馈接口出错",
        detail: String(error),
      },
      { status: 500 }
    );
  }
}
