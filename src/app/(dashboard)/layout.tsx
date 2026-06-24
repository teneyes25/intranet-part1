import { AppShell } from "@/components/layout/app-shell";
import { BrandingStyles } from "@/components/branding/branding-styles";
import { PilotUsageTracker } from "@/components/pilot/pilot-usage-tracker";
import { getPilotBannerForUser } from "@/features/pilot/pilot-service";
import { getActiveEmergencyNotice } from "@/features/system/system-service";
import { getEffectiveBranding } from "@/lib/dealer/branding";
import { requireUser } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const [pilotBanner, emergency, branding] = await Promise.all([
    getPilotBannerForUser(user.id),
    getActiveEmergencyNotice(),
    getEffectiveBranding(user.dealerId),
  ]);

  return (
    <>
      <BrandingStyles branding={branding} />
      <PilotUsageTracker enabled={pilotBanner.show} />
      <AppShell
        user={{
          name: user.name ?? "사용자",
          email: user.email ?? "",
          role: user.role,
        }}
        branding={{
          appName: branding.appName,
          logoStorageKey: branding.logoStorageKey,
          bannerStorageKey: branding.bannerStorageKey,
          bannerMediaType: branding.bannerMediaType,
        }}
        pilotBanner={pilotBanner}
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
    </>
  );
}
