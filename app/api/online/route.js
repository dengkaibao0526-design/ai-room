const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req) {
  try {
    const body = await req.json();

    if (!body.userId) {
      return Response.json({ ok: false });
    }

    await fetch(`${SUPABASE_URL}/rest/v1/online_users`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        user_id: body.userId,
        last_seen: new Date().toISOString(),
      }),
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Online API Error:", error);
    return Response.json({ ok: false });
  }
}
