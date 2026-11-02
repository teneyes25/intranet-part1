"use client";
import { useEffect, useState } from "react";
type Batch = { id: string; kind: string; period: string; sheet: string; filename: string; created_at: string; valid: number; active: number; supersedes: string | null; report: string };
export default function ImportPanel() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState("sales");
  const [period, setPeriod] = useState("2026-08");
  const [sheet, setSheet] = useState("");
  const [replace, setReplace] = useState(false);
  const active = batches.find(b => b.active && b.kind === kind && b.period === period && b.sheet === sheet);
  async function refresh() {
    const response = await fetch("/api/erp/imports", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setBatches(data.batches);
  }
  useEffect(() => { refresh().catch(e => setMessage(String(e))); }, []);
  return <section className="space-y-6">
    <form className="space-y-3 rounded border p-4" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setMessage("");
      const form = new FormData(e.currentTarget);
      if (active && !replace) { setMessage("수정본으로 대체하려면 아래 확인란을 선택하십시오."); setBusy(false); return; }
      form.set("expectedActive", active?.id ?? "");
      try {
        const response = await fetch("/api/erp/imports", { method: "POST", body: form });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setMessage(result.duplicate ? "동일 파일이 이미 보존되어 있습니다. 중복 입력하지 않았습니다." : result.active ? "검증 통과. 현재 검토 자료로 지정했습니다." : "검증 오류. 원본은 보존했고 이전 정상 자료는 유지했습니다.");
        setReplace(false); await refresh();
      } catch (e) { setMessage(String(e)); } finally { setBusy(false); }
    }}>
      <label className="block">자료 종류 <select name="kind" value={kind} onChange={e => { setKind(e.target.value); setReplace(false); }} className="border p-2">
        <option value="sales">판매</option><option value="purchases">매입</option><option value="master">품목</option><option value="stock">재고</option><option value="movement">입출고</option>
      </select></label>
      <label className="block">기준월 <input required type="month" name="period" value={period} onChange={e => { setPeriod(e.target.value); setReplace(false); }} className="border p-2" /></label>
      <label className="block">원본 시트명 <input required name="sheet" value={sheet} onChange={e => { setSheet(e.target.value); setReplace(false); }} className="border p-2" placeholder="예: 8월말 재고" /></label>
      <p className="text-sm">기준월은 검토용 분류입니다. 파일 내부 거래기간과의 일치는 별도 확인해야 합니다. 같은 자료의 수정본은 같은 종류·기준월·시트명을 사용하십시오.</p>
      <input required type="file" name="file" accept=".xlsx" aria-label="엑셀 원본" />
      {active && <label className="block"><input type="checkbox" checked={replace} onChange={e => setReplace(e.target.checked)} /> 현재 자료 {active.filename}의 수정본으로 지정 (이전 원본 보존)</label>}
      <button disabled={busy} className="block rounded bg-slate-900 px-4 py-2 text-white">{busy ? "검증 중…" : "업로드·검증"}</button>
    </form>
    <p role="status">{message}</p>
    <h2 className="text-lg font-semibold">최근 100건의 원본·수정 이력</h2>
    {batches.map(b => <article key={b.id} className="rounded border p-4">
      <p className="font-medium">{b.period} · {b.kind} · {b.sheet} · {b.filename}</p>
      <p>{b.active ? "현재 검토 자료" : b.valid ? "이전 자료" : "검증 오류"} · {b.created_at} UTC</p>
      {b.supersedes && <p className="text-sm">이전 자료: {b.supersedes}</p>}
      <details><summary>검증 상세</summary><pre className="overflow-auto text-xs">{JSON.stringify(JSON.parse(b.report), null, 2)}</pre></details>
    </article>)}
  </section>;
}
