import type { SiteSettings } from "@prisma/client";

export function BrandingHead({ settings }: { settings: SiteSettings }) {
  return (
    <>
      {settings.faviconStorageKey && (
        <link rel="icon" href="/api/branding/asset?asset=favicon" />
      )}
    </>
  );
}

export type BrandingConfig = Pick<
  SiteSettings,
  "appName" | "logoStorageKey" | "bannerStorageKey" | "bannerMediaType"
>;
