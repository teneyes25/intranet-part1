import { AppShell } from "@/components/layout/app-shell";
import { BrandingStyles } from "@/components/branding/branding-styles";
import { MaejongiHomeBanner } from "@/features/ai/components/maejongi-home-banner";
import { MessengerHomeWidget } from "@/features/messenger/components/messenger-widget";
import { getActiveEmergencyNotice } from "@/features/system/system-service";
import { getEffectiveBranding } from "@/lib/dealer/branding";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const [emergency, branding, boards] = await Promise.all([
    getActiveEmergencyNotice(),
    getEffectiveBranding(user.dealerId),
    prisma.board.findMany({
      select: { key: true, name: true, sortOrder: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <>
      <BrandingStyles branding={branding} />
      <AppShell
        user={{
          name: user.name ?? "사용자",
          email: user.email ?? "",
          role: user.role,
        }}
        boards={boards}
        branding={{
          appName: branding.appName,
          logoStorageKey: branding.logoStorageKey,
          bannerStorageKey: branding.bannerStorageKey,
          bannerMediaType: branding.bannerMediaType,
        }}
        emergencyNotice={
          emergency
            ? {
                id: emergency.id,
                title: emergency.title,
                body: emergency.body,
                isAdmin: user.role === "ADMIN",
              }
            : null
        }
      >
        {children}
      </AppShell>
      <MaejongiHomeBanner floating />
      <MessengerHomeWidget />
    </>
  );
}
