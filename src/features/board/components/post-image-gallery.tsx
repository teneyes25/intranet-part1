"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";

import { Button } from "@/components/ui/button";

interface GalleryImage {
  id: string;
  filename: string;
  url: string;
}

export function PostImageGallery({ images }: { images: GalleryImage[] }) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowLeft") setActive((i) => (i === 0 ? images.length - 1 : i - 1));
      if (e.key === "ArrowRight") setActive((i) => (i === images.length - 1 ? 0 : i + 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, images.length]);

  if (images.length === 0) return null;

  const current = images[active]!;

  function prev() {
    setActive((i) => (i === 0 ? images.length - 1 : i - 1));
  }

  function next() {
    setActive((i) => (i === images.length - 1 ? 0 : i + 1));
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl border bg-muted/30">
        <button
          type="button"
          className="relative block aspect-[16/10] w-full cursor-zoom-in touch-manipulation"
          onClick={() => setLightbox(true)}
          aria-label="이미지 확대"
        >
          <Image
            src={current.url}
            alt={current.filename}
            fill
            className="object-contain"
            sizes="(max-width:768px) 100vw, 720px"
            unoptimized
            priority
          />
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-xs text-muted-foreground">
            <ZoomIn className="h-3.5 w-3.5" />
            {active + 1} / {images.length}
          </span>
        </button>
        {images.length > 1 && (
          <>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute left-2 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full shadow-md touch-target-sm"
              onClick={prev}
              aria-label="이전 이미지"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute right-2 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full shadow-md touch-target-sm"
              onClick={next}
              aria-label="다음 이미지"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              className={`relative h-16 w-20 shrink-0 snap-start overflow-hidden rounded-lg border-2 transition-colors touch-manipulation ${
                i === active ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <Image src={img.url} alt="" fill className="object-cover" sizes="80px" unoptimized />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="이미지 확대 보기"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 text-white hover:bg-white/10 touch-target-sm"
            onClick={() => setLightbox(false)}
          >
            <X className="h-6 w-6" />
          </Button>
          {images.length > 1 && (
            <>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full touch-target-sm"
                onClick={prev}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full touch-target-sm"
                onClick={next}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          )}
          <Image
            src={current.url}
            alt={current.filename}
            width={1200}
            height={900}
            className="max-h-[90vh] max-w-full object-contain"
            unoptimized
          />
        </div>
      )}
    </div>
  );
}
