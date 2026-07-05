"use client";

import { Monitor, Smartphone, Tablet, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { LayoutContentHydrator } from "@/features/page-layout/components/layout-content-hydrator";
import {
  sanitizePageLayoutCss,
  sanitizePageLayoutHtml,
} from "@/features/page-layout/sanitize";
import { cn } from "@/lib/utils";

type PreviewDevice = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTH: Record<PreviewDevice, string> = {
  desktop: "100%",
  tablet: "820px",
  mobile: "390px",
};

interface PageBuilderPreviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  html: string;
  css: string;
  title: string;
  device: PreviewDevice;
  onDeviceChange: (device: PreviewDevice) => void;
}

export function PageBuilderPreviewSheet({
  open,
  onOpenChange,
  html,
  css,
  title,
  device,
  onDeviceChange,
}: PageBuilderPreviewSheetProps) {
  const safeHtml = sanitizePageLayoutHtml(html);
  const safeCss = sanitizePageLayoutCss(css);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex h-[92dvh] flex-col gap-0 p-0 sm:max-w-none"
        hideClose
        autoFocusSelector='[data-sheet-close="preview"]'
      >
        <SheetHeader className="shrink-0 border-b border-border/60 px-4 py-3 text-left sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <SheetTitle className="text-base">저장 전 미리보기</SheetTitle>
              <SheetDescription>{title} · 실제 저장 전 캔버스 상태</SheetDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              data-sheet-close="preview"
              onClick={() => onOpenChange(false)}
              aria-label="미리보기 닫기"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div
            className="mt-3 flex gap-1 rounded-lg border border-border/70 bg-muted/30 p-0.5"
            role="group"
            aria-label="미리보기 기기"
          >
            {(
              [
                ["desktop", Monitor, "데스크톱"],
                ["tablet", Tablet, "태블릿"],
                ["mobile", Smartphone, "모바일"],
              ] as const
            ).map(([id, Icon, label]) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={device === id ? "default" : "ghost"}
                className="h-8 flex-1 text-xs"
                onClick={() => onDeviceChange(id)}
              >
                <Icon className="mr-1 h-3.5 w-3.5" />
                {label}
              </Button>
            ))}
          </div>
        </SheetHeader>
        <div className="flex flex-1 justify-center overflow-auto bg-muted/30 p-4">
          <div
            className={cn(
              "overflow-hidden rounded-xl border border-border/70 bg-background shadow-elevated transition-[width] duration-300",
              device !== "desktop" && "mx-auto",
            )}
            style={{ width: DEVICE_WIDTH[device], maxWidth: "100%" }}
          >
            {safeCss && (
              <style dangerouslySetInnerHTML={{ __html: safeCss }} />
            )}
            <div className="min-h-[200px] p-4">
              <LayoutContentHydrator html={safeHtml} />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
