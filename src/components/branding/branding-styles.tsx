import type { EffectiveBranding } from "@/lib/dealer/branding";
import { brandingStylesCss } from "@/lib/dealer/branding";

export function BrandingStyles({ branding }: { branding: EffectiveBranding }) {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: brandingStylesCss(branding),
      }}
    />
  );
}
