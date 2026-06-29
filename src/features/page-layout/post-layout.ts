import { POST_DETAIL_BOARD_KEYS } from "@/features/page-layout/types";

export function isPostDetailBoardKey(key: string): boolean {
  return (POST_DETAIL_BOARD_KEYS as readonly string[]).includes(key);
}

export function postDetailSlugForPost(postId: string): string {
  return `post-detail:${postId}`;
}

export function parsePostDetailSlug(slug: string):
  | { kind: "board"; boardKey: string }
  | { kind: "post"; postId: string }
  | null {
  if (!slug.startsWith("post-detail:")) return null;
  const id = slug.slice(12);
  if (!id) return null;
  if (isPostDetailBoardKey(id)) return { kind: "board", boardKey: id };
  return { kind: "post", postId: id };
}
