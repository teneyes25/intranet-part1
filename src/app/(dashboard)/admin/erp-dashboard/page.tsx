import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import DashboardPanel from "./panel";
export default async function Page() {
  await requireRole(["ADMIN"]);
  return <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-semibold tracking-widest text-slate-500">FRENCH MAISON · ERP</p><h1 className="mt-2 text-3xl font-semibold text-slate-900">경영 대시보드</h1></div><Link className="rounded-lg border px-4 py-2 text-sm" href="/admin/erp-imports">원본 업로드·비용 검토</Link></header>
    <DashboardPanel />
  </main>;
}
