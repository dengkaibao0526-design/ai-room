import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const filePath = path.join(process.cwd(), "public", "downloads", "XiaoKB.mobileconfig");
  const profile = await readFile(filePath);

  return new Response(profile, {
    headers: {
      "Content-Type": "application/x-apple-aspen-config",
      "Content-Disposition": "attachment; filename=\"XiaoKB.mobileconfig\"",
      "Cache-Control": "public, max-age=300",
    },
  });
}
