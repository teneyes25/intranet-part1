import { BrandingStyles } from "@/components/branding/branding-styles";
import { getEffectiveBranding } from "@/lib/dealer/branding";
import { requireUser } from "@/lib/auth/session";

/** 기안 팝업 전용 — 사이드바/탑바/매종이 배너 없음 */
export default async function PopupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const branding = await getEffectiveBranding(user.dealerId);

  return (
    <>
      <BrandingStyles branding={branding} />
      <div className="min-h-screen bg-background">{children}</div>
    </>
  );
}
