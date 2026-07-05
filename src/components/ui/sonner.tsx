"use client";

import { Toaster as Sonner } from "sonner";
import { useTheme } from "next-themes";

export function Toaster() {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme as "light" | "dark" | "system"}
      richColors
      closeButton
      position="top-right"
      offset={16}
      gap={10}
      toastOptions={{
        duration: 4200,
        classNames: {
          toast:
            "group rounded-xl border border-border/70 bg-card/95 text-foreground shadow-elevated backdrop-blur-md",
          title: "text-sm font-semibold",
          description: "text-xs text-muted-foreground",
          actionButton:
            "rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground",
          cancelButton:
            "rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium",
          closeButton:
            "rounded-lg border border-border/60 bg-background text-muted-foreground hover:bg-muted",
          success: "border-emerald-500/25",
          error: "border-destructive/25",
          warning: "border-amber-500/25",
          info: "border-accent/25",
        },
      }}
    />
  );
}
