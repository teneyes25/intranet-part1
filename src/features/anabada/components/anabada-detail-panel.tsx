"use client";

import Link from "next/link";
import { MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { saleStatusLabel } from "@/features/board/board-search-utils";

function formatPrice(price: number | null | undefined) {
  if (price == null) return "나눔";
  if (price === 0) return "무료 나눔";
  return `${price.toLocaleString("ko-KR")}원`;
}

function statusClass(status: string | null | undefined) {
  if (status === "selling") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (status === "reserved") return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  if (status === "completed") return "bg-muted text-muted-foreground";
  return "bg-muted text-muted-foreground";
}

interface AnabadaDetailPanelProps {
  postId: string;
  boardKey: string;
  title: string;
  price: number | null;
  saleStatus: string | null;
  authorName: string;
}

export function AnabadaDetailPanel({
  postId,
  boardKey,
  title,
  price,
  saleStatus,
  authorName,
}: AnabadaDetailPanelProps) {
  const shareUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `/boards/${boardKey}/${postId}`;

  function handleShare() {
    if (navigator.share) {
      void navigator.share({ title, url: shareUrl }).catch(() => {});
    } else {
      void navigator.clipboard.writeText(shareUrl);
      toast.success("링크가 복사되었습니다.");
    }
  }

  return (
    <div className="anabada-detail-panel rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.06] to-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">
            {formatPrice(price)}
          </p>
          {saleStatus && (
            <Badge className={`mt-2 ${statusClass(saleStatus)}`}>
              {saleStatusLabel(saleStatus)}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-10 touch-target-sm"
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4" />
            공유
          </Button>
          <Button asChild size="sm" className="min-h-10 touch-target-sm">
            <Link href={`#comment-form-${postId}`}>
              <MessageCircle className="h-4 w-4" />
              문의하기
            </Link>
          </Button>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        판매자 <span className="font-medium text-foreground">{authorName}</span>
        · 댓글로 문의하거나 DM 정책에 따라 연락하세요.
      </p>
    </div>
  );
}
