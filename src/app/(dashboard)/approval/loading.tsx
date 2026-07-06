import { LoadingState } from "@/components/ui/loading-state";

export default function ApprovalLoading() {
  return <LoadingState label="전자결재를 불러오는 중…" variant="skeleton" />;
}
