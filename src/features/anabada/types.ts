import type { PostRow } from "@/features/board/components/post-list";

export interface AnabadaPostRow extends PostRow {
  price: number | null;
  saleStatus: string | null;
  attachments?: { id: string; mimeType: string | null }[];
}
