import { AppShell } from "@/components/layout/app-shell";
import { BrandingStyles } from "@/components/branding/branding-styles";
import { getActiveEmergencyNotice } from "@/features/system/system-service";
import { getEffectiveBranding } from "@/lib/dealer/branding";
import { requireUser } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const [emergency, branding] = await Promise.all([
    getActiveEmergencyNotice(),
    getEffectiveBranding(user.dealerId),
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
    </>
  );
}
