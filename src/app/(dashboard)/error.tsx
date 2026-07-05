"use client";

import { PageError } from "@/components/ui/page-error";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page-shell">
      <PageError
        message={error.message || "예기치 않은 오류가 발생했습니다."}
        reset={reset}
      />
    </div>
  );
}
