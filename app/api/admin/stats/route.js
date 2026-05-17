const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const password = searchParams.get("password");

    if (password !== ADMIN_PASSWORD) {
      return Response.json({ error: "密码错误" }, { status: 401 });
    }

    const logsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/chat_logs?select=*&order=created_at.desc&limit=100`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    const logs = await logsRes.json();

    const allLogsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/chat_logs?select=user_id,created_at`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    const allLogs = await allLogsRes.json();

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const onlineRes = await fetch(
      `${SUPABASE_URL}/rest/v1/online_users?select=*&last_seen=gte.${fiveMinutesAgo}`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    const onlineUsers = await onlineRes.json();

    const uniqueUsers = new Set(allLogs.map((log) => log.user_id)).size;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayMessages = allLogs.filter((log) => {
      return new Date(log.created_at) >= today;
    }).length;

    return Response.json({
      totalUsers: uniqueUsers,
      totalMessages: allLogs.length,
      todayMessages,
      onlineUsers: onlineUsers.length,
      logs,
    });
  } catch (error) {
    console.error("Admin stats error:", error);

    return Response.json({ error: "服务器错误" }, { status: 500 });
  }
}
