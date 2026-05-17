const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export async function POST(req) {
  try {
    const body = await req.json();

    if (body.password !== ADMIN_PASSWORD) {
      return Response.json({
        ok: false,
        message: "密码错误",
      });
    }

    const logsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/chat_logs?select=
