"use client";

import { useState } from "react";
import Image from "next/image";
import { ImagePlus, X } from "lucide-react";

import { Label } from "@/components/ui/label";
import { MAX_FILES } from "@/features/board/constants";

interface PreviewFile {
  key: string;
  name: string;
  url: string;
  isImage: boolean;
}

export function AnabadaFileUpload() {
  const [previews, setPreviews] = useState<PreviewFile[]>([]);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    previews.forEach((p) => URL.revokeObjectURL(p.url));
    const files = Array.from(e.target.files ?? []);
    setPreviews(
      files.map((f, i) => ({
        key: `${f.name}-${i}`,
        name: f.name,
        url: URL.createObjectURL(f),
        isImage: f.type.startsWith("image/"),
      })),
    );
  }

  function clearOne(key: string) {
    setPreviews((prev) => {
      const target = prev.find((p) => p.key === key);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.key !== key);
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="anabada-files">
          상품 사진·첨부파일{" "}
          <span className="text-xs font-normal text-muted-foreground">
            (최대 {MAX_FILES}개, 이미지 권장 · 개당 10MB)
          </span>
        </Label>
        <label
          htmlFor="anabada-files"
          className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/[0.03] px-4 py-6 transition-colors hover:bg-primary/[0.06] touch-manipulation"
        >
          <ImagePlus className="h-8 w-8 text-primary/60" />
          <span className="text-sm text-muted-foreground">탭하여 사진 선택 (여러 장 가능)</span>
          <input
            id="anabada-files"
            name="files"
            type="file"
            multiple
            accept="image/*,.pdf,.zip"
            className="sr-only"
            onChange={onChange}
          />
        </label>
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {previews.map((p) => (
            <div key={p.key} className="relative aspect-square overflow-hidden rounded-lg border">
              {p.isImage ? (
                <Image src={p.url} alt={p.name} fill className="object-cover" unoptimized />
              ) : (
                <div className="flex h-full items-center justify-center bg-muted p-2 text-center text-[10px]">
                  {p.name}
                </div>
              )}
              <button
                type="button"
                className="absolute right-1 top-1 rounded-full bg-background/90 p-0.5 shadow"
                onClick={() => clearOne(p.key)}
                aria-label="미리보기 제거"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
