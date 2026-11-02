import { requireRole } from "@/lib/auth/session";
import ImportPanel from "./panel";
export default async function Page() {
  await requireRole(["ADMIN"]);
  return <main className="mx-auto max-w-5xl p-6"><h1 className="text-2xl font-semibold">ERP 자료 수집·검토</h1><p className="my-3 text-sm text-slate-600">원본과 수정 이력을 보존합니다. 검증 통과는 손익 확정을 의미하지 않습니다.</p><ImportPanel /></main>;
}
