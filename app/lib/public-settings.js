function normalizeBoolean(value, fallback) {
  if (value === true || value === "true" || value === 1 || value === "1") {
    return true;
  }

  if (value === false || value === "false" || value === 0 || value === "0") {
    return false;
  }

  return fallback;
}

export async function readServerSettings(defaults) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const keys = Object.keys(defaults);

  if (!supabaseUrl || !supabaseKey || keys.length === 0) return defaults;

  try {
    const encodedKeys = keys.map(encodeURIComponent).join(",");
    const res = await fetch(
      `${supabaseUrl}/rest/v1/app_settings?select=key,value&key=in.(${encodedKeys})`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!res.ok) throw new Error(`读取功能开关失败：${res.status}`);

    const rows = await res.json();
    const settings = { ...defaults };

    for (const row of Array.isArray(rows) ? rows : []) {
      if (Object.hasOwn(settings, row?.key)) {
        settings[row.key] = normalizeBoolean(row.value, settings[row.key]);
      }
    }

    return settings;
  } catch (error) {
    console.error("READ_SERVER_SETTINGS_ERROR:", error);
    return defaults;
  }
}
