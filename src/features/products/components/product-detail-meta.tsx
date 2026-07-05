import { Package, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ProductPostMeta } from "@/features/products/product-meta";

export function ProductDetailMeta({ meta }: { meta: ProductPostMeta }) {
  const inStock = meta.totalStock > 0;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/15 bg-primary/[0.04] px-4 py-3">
      {meta.unitPrice != null && (
        <p className="text-xl font-bold text-primary sm:text-2xl">
          {meta.unitPrice.toLocaleString("ko-KR")}
          <span className="text-sm font-normal text-muted-foreground">원</span>
        </p>
      )}
      <Badge variant={inStock ? "default" : "destructive"} className="gap-1">
        <Package className="h-3.5 w-3.5" />
        {inStock ? `재고 ${meta.totalStock}` : "품절"}
      </Badge>
      {meta.sku && (
        <Badge variant="outline" className="text-xs">
          SKU {meta.sku}
        </Badge>
      )}
      <Badge variant="secondary" className="gap-1 text-xs">
        <TrendingUp className="h-3.5 w-3.5" />
        {meta.isActive ? "판매중" : "비활성"}
      </Badge>
    </div>
  );
}
