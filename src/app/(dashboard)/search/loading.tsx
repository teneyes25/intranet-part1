import { LoadingState } from "@/components/ui/loading-state";

export default function SearchLoading() {
  return <LoadingState label="검색 결과를 불러오는 중…" variant="skeleton" />;
}
