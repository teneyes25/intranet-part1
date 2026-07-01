import { NextResponse } from "next/server";

import { listCompanyThemePresets } from "@/features/company-theme/registry";

/** 등록된 회사 테마 프리셋 목록 (다른 회사 적용 시 참조) */
export async function GET() {
  const presets = listCompanyThemePresets().map((p) => ({
    id: p.id,
    label: p.label,
    description: p.description,
    sourceUrl: p.sourceUrl,
    companyName: p.companyName,
    tagline: p.tagline,
  }));
  return NextResponse.json({ presets });
}
