const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export async function GET(req) {
  const version = "admin-stats-v2";

  try {
    const { searchParams } = new URL(req.url);
    const password = searchParams.get("password");

    if (!ADMIN_PASSWORD) {
      return Response.json(
        { version, error: "ADMIN_PASSWORD 没有配置" },
        { status: 500 }
      );
    }

    if (password !== ADMIN_PASSWORD) {
      return Response.json(
        { version, error: "密码错误" },
        { status: 401 }
      );
    }

    const headers = {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    };

    const logsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/chat_logs?select=*&order=created_at.desc&limit=100`,
      { headers }
    );

    const logs = await logsRes.json();

    const onlineSince = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const onlineRes = await fetch(
      `${SUPABASE_URL}/rest/v1/online_users?select=*&last_seen=gte.${onlineSince}`,
      { headers }
    );

    const onlineUsers = await onlineRes.json();

    const uniqueUsers = new Set(logs.map((log) => log.user_id)).size;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayMessages = logs.filter((log) => {
      return new Date(log.created_at) >= today;
    }).length;

    return Response.json({
      version,
      ok: true,
      stats: {
        totalUsers: uniqueUsers,
        totalMessages: logs.length,
        todayMessages,
        onlineUsers: onlineUsers.length,
      },
      logs,
    });
  } catch (error) {
    console.error("ADMIN_STATS_V2_ERROR:", error);

    return Response.json(
      {
        version,
        ok: false,
        error: "后台接口出错",
        detail: String(error),
      },
      { status: 500 }
    );
  }
}
