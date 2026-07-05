import { LoadingState } from "@/components/ui/loading-state";

export default function DashboardLoading() {
  return <LoadingState variant="skeleton" label="페이지를 불러오는 중…" />;
}
