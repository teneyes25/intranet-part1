import { NextResponse } from "next/server";
import fs from "node:fs";

import { getSiteSettings } from "@/features/customize/site-settings-service";
import { resolveBrandingPath } from "@/lib/branding/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const asset = searchParams.get("asset");
  if (!asset || !["logo", "favicon", "banner"].includes(asset)) {
    return NextResponse.json({ error: "invalid asset" }, { status: 400 });
  }

  const settings = await getSiteSettings();
  const key =
    asset === "logo"
      ? settings.logoStorageKey
      : asset === "favicon"
        ? settings.faviconStorageKey
        : settings.bannerStorageKey;

  if (!key) return new NextResponse(null, { status: 404 });

  const filePath = resolveBrandingPath(key);
  if (!fs.existsSync(filePath)) return new NextResponse(null, { status: 404 });

  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  const buf = fs.readFileSync(filePath);
  return new NextResponse(buf, {
    headers: {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
