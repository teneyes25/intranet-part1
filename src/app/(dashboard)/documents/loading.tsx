import { LoadingState } from "@/components/ui/loading-state";

export default function DocumentsLoading() {
  return <LoadingState label="문서함을 불러오는 중…" variant="skeleton" />;
}
