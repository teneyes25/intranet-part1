import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Package, ShoppingBag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ProductPostMeta } from "@/features/products/product-meta";

function stockLabel(stock: number) {
  if (stock <= 0) return { text: "품절", variant: "destructive" as const };
  if (stock < 10) return { text: `잔여 ${stock}`, variant: "secondary" as const };
  return { text: "재고 있음", variant: "default" as const };
}

interface ProductPreviewCardProps {
  href: string;
  title: string;
  snippet?: string;
  category?: string | null;
  imageUrl?: string | null;
  meta?: ProductPostMeta | null;
  highlight?: ReactNode;
}

export function ProductPreviewCard({
  href,
  title,
  snippet,
  category,
  imageUrl,
  meta,
  highlight,
}: ProductPreviewCardProps) {
  const stock = meta ? stockLabel(meta.totalStock) : null;

  return (
    <Link
      href={href}
      className="product-preview-card group flex gap-3 rounded-xl border bg-card p-3 transition-all hover:border-primary/30 hover:shadow-sm active:scale-[0.99] sm:p-4"
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted/50 sm:h-24 sm:w-24">
        {imageUrl ? (
          <Image src={imageUrl} alt="" fill className="object-cover" sizes="96px" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground/40">
            <Package className="h-8 w-8" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="text-[10px]">
            <ShoppingBag className="mr-0.5 h-3 w-3" />
            상품
          </Badge>
          {category && (
            <Badge variant="secondary" className="text-[10px]">
              {category}
            </Badge>
          )}
          {stock && (
            <Badge variant={stock.variant} className="text-[10px]">
              {stock.text}
            </Badge>
          )}
        </div>
        <p className="mt-1 line-clamp-1 text-sm font-semibold group-hover:text-primary">
          {highlight ?? title}
        </p>
        {meta?.unitPrice != null && (
          <p className="mt-0.5 text-base font-bold text-primary">
            {meta.unitPrice.toLocaleString("ko-KR")}원
          </p>
        )}
        {snippet && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{snippet}</p>
        )}
        {meta?.sku && (
          <p className="mt-1 text-[10px] text-muted-foreground">SKU {meta.sku}</p>
        )}
      </div>
    </Link>
  );
}
