const STORE_KEY = Symbol.for("xiaokb.rateLimitStore");

const store = globalThis[STORE_KEY] || new Map();
globalThis[STORE_KEY] = store;

function getClientIp(req) {
  const directIp =
    req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip");

  if (directIp) return directIp.trim().slice(0, 100);

  const forwardedFor = req.headers.get("x-forwarded-for");
  return (forwardedFor?.split(",")[0]?.trim() || "unknown").slice(0, 100);
}

function cleanup(now) {
  if (store.size < 5000) return;

  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

export function checkRateLimit(req, { name, limit, windowMs }) {
  const now = Date.now();
  cleanup(now);

  const key = `${name}:${getClientIp(req)}`;
  let entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
  }

  entry.count += 1;
  store.set(key, entry);

  const remaining = Math.max(0, limit - entry.count);
  const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));

  return {
    allowed: entry.count <= limit,
    headers: {
      "RateLimit-Limit": String(limit),
      "RateLimit-Remaining": String(remaining),
      "RateLimit-Reset": String(Math.ceil(entry.resetAt / 1000)),
      ...(entry.count > limit ? { "Retry-After": String(retryAfter) } : {}),
    },
  };
}

export function rateLimitResponse(result) {
  return Response.json(
    { ok: false, error: "请求太频繁，请稍后再试" },
    { status: 429, headers: result.headers }
  );
}
