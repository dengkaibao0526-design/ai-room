import { checkRateLimit, rateLimitResponse } from "../../lib/rate-limit";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req) {
  const rateLimit = checkRateLimit(req, {
    name: "online",
    limit: 4,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

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

    // 兼容两种写法：
    // 新写法：user_id
    // 旧写法：userId
    const user_id = body.user_id || body.userId;

    if (!user_id || typeof user_id !== "string") {
      return Response.json(
        {
          ok: false,
          error: "缺少 user_id",
        },
        { status: 400 }
      );
    }

    const safeUserId = user_id.slice(0, 100);

    const res = await fetch(`${SUPABASE_URL}/rest/v1/online_users`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        user_id: safeUserId,
        last_seen: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      const text = await res.text();

      return Response.json(
        {
          ok: false,
          error: "在线状态更新失败",
          detail: text,
        },
        { status: 500 }
      );
    }

    return Response.json({
      ok: true,
      user_id: safeUserId,
    });
  } catch (error) {
    console.error("ONLINE_API_ERROR:", error);

    return Response.json(
      {
        ok: false,
        error: "在线接口出错",
        detail: String(error),
      },
      { status: 500 }
    );
  }
}
