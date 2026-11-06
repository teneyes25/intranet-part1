import { requireRole } from "@/lib/auth/session";
import ImportPanel from "./panel";
import ReviewPanel from "./review-panel";
export default async function Page() {
  await requireRole(["ADMIN"]);
  return <main className="mx-auto max-w-6xl space-y-8 p-6"><h1 className="text-2xl font-semibold">ERP 자료 수집·검토</h1><p className="my-3 text-sm text-slate-600">원본과 수정 이력을 보존합니다. 검증 통과는 손익 확정을 의미하지 않습니다.</p><ReviewPanel /><details><summary className="cursor-pointer text-lg font-semibold">원본 업로드·수정 이력</summary><ImportPanel /></details></main>;
}
