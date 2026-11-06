"use client";
import { useEffect, useState } from "react";
type Row = { source_row: number; label?: string; gross?: string | null; period?: string; eligible?: boolean; summary_only?: boolean; duplicate_candidate?: boolean; code?: string; net?: string };
type Source = { id: string; filename: string; kind: string; sheet: string; period: string; rows: Row[] };
type Review = { id: number; batch_id: string; source_row: number; actor: string; created_at: string; data: Record<string, string> };
type Allocation = { id: string; period: string; created_at: string; stale: boolean; result: { total: number; allocated: number; difference: number; products: { code: string; category: string; net_sales: string; allocated: number }[] } };
type State = { sources: Source[]; reviews: Review[]; audit: Review[]; allocations: Allocation[]; fingerprint: string };
const statusLabels: Record<string, string> = { include: "배부 포함", exclude: "배부 제외", hold: "보류" };
const categories = ["EVERYDAY", "NATURAL WARMTH", "COOLING", "SOFT WARMTH"];
const money = (v: string | number | null | undefined) => v == null ? "미입력" : Number(v).toLocaleString("ko-KR");
export default function ReviewPanel() {
  const [data, setData] = useState<State>();
  const [period, setPeriod] = useState("2026-09");
  const [selected, setSelected] = useState<{ source: Source; row: Row }>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [zero, setZero] = useState(false);
  async function refresh() {
    const r = await fetch("/api/erp/reviews", { cache: "no-store" }); const d = await r.json();
    if (!r.ok) throw new Error(d.error); setData(d); setSelected(undefined); setMapping({}); setZero(false);
  }
  useEffect(() => { refresh().catch(e => setMessage(String(e))); }, []);
  async function post(payload: object) {
    setBusy(true); setMessage("");
    try {
      const r = await fetch("/api/erp/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      await refresh(); setMessage("저장했습니다. 최신 원본과 검토 기록을 반영했습니다.");
    } catch (e) { setMessage(String(e)); } finally { setBusy(false); }
  }
  const prior = selected && data?.reviews.find(r => r.batch_id === selected.source.id && r.source_row === selected.row.source_row);
  const costs = data?.sources.filter(s => ["cards", "expenses"].includes(s.kind)) ?? [];
  const rows = costs.flatMap(source => source.rows.filter(row => row.eligible && row.gross != null && row.period === period).map(row => ({ source, row })));
  const pending = rows.filter(({ source, row }) => !["include", "exclude"].includes(data?.reviews.find(r => r.batch_id === source.id && r.source_row === row.source_row)?.data.status ?? ""));
  const sales = data?.sources.filter(s => s.kind === "sales" && s.period === period) ?? [];
  const codes = Array.from(new Set(sales.flatMap(s => s.rows.map(r => r.code ?? "")))).filter(Boolean).sort();
  return <section className="space-y-5" aria-label="비용 검토와 배부">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h2 className="text-xl font-semibold">비용 검토 → 월별 배부</h2><p className="text-sm text-slate-600">검토한 비용의 배부 미리보기입니다. 확정 손익에는 반영하지 않습니다.</p></div>
      <button disabled={busy} onClick={() => refresh().catch(e => setMessage(String(e)))} className="rounded border px-4 py-2">자료 새로 조회</button>
    </div>
    <label className="block">귀속월 <input aria-label="검토 귀속월" type="month" className="rounded border p-2" value={period} onChange={e => { setPeriod(e.target.value); setSelected(undefined); setMapping({}); setZero(false); }} /></label>
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded border p-4">검토 대상 <strong className="block text-2xl">{rows.length}행</strong></div>
      <div className="rounded border p-4">미검토·보류 <strong className="block text-2xl">{pending.length}행</strong></div>
      <div className="rounded border p-4">동일월 판매 원본 <strong className="block text-2xl">{sales.length}개</strong></div>
    </div>
    <p role="status" className="text-sm">{message}</p>
    {!data && <p>자료를 불러오는 중입니다. 오류가 표시되면 새로 조회하십시오.</p>}
    {data && !costs.length && <p>비용 원본을 먼저 업로드하십시오. 파일이 없으면 비용 0원으로 처리하지 않습니다.</p>}
    {costs.map(source => <details key={source.id} open className="rounded border p-4">
      <summary className="font-medium">{source.filename} · {source.sheet} · {source.kind === "cards" ? "카드 사용내역" : "입출금 결산 요약"}</summary>
      {source.kind === "expenses" && <p className="my-2 text-sm text-slate-600">요약 금액만으로 비용을 확정할 수 없습니다. 상세 대사 근거를 입력하십시오. 카드대금·매입대금·자금거래·영업외 항목은 배부에서 제외됩니다.</p>}
      <div className="max-h-96 overflow-auto"><table className="w-full text-sm"><thead className="sticky top-0 bg-slate-100 text-left"><tr><th className="p-2">원본 행</th><th>내용</th><th>사용/자료월</th><th className="text-right">금액</th><th className="p-2">검토</th></tr></thead><tbody>
        {source.rows.map(row => {
          const review = data?.reviews.find(r => r.batch_id === source.id && r.source_row === row.source_row);
          return <tr key={row.source_row} className="border-t"><td className="p-2">{row.source_row}</td><td>{row.label}{row.duplicate_candidate && <span className="ml-2 text-amber-700">중복 후보</span>}</td><td>{row.period}</td><td className="text-right tabular-nums">{money(row.gross)}</td><td className="p-2">{row.eligible && row.gross != null ? <button className="rounded border px-3 py-1" disabled={busy} onClick={() => setSelected({ source, row })}>{review ? (statusLabels[review.data.status ?? "hold"] ?? "검토") : "검토 입력"}</button> : "배부 제외"}</td></tr>;
        })}
      </tbody></table></div>
    </details>)}
    {selected && <form key={`${selected.source.id}-${selected.row.source_row}-${prior?.id}`} className="space-y-3 rounded border-2 border-slate-800 p-4" onSubmit={async e => {
      e.preventDefault(); const form = new FormData(e.currentTarget);
      await post({ action: "save_review", batch_id: selected.source.id, source_row: selected.row.source_row, expected_review: prior?.id ?? null, review: Object.fromEntries(form) });
    }}>
      <h3 className="font-semibold">{selected.row.source_row}행 · {selected.row.label} · {money(selected.row.gross)}원</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>처리 상태<select className="block w-full border p-2" name="status" defaultValue={prior?.data.status ?? "hold"}><option value="hold">보류</option><option value="exclude">배부 제외</option><option value="include">배부 포함</option></select></label>
        <label>귀속월<input className="block w-full border p-2" type="month" name="period" defaultValue={prior?.data.period ?? selected.row.period} /></label>
        <label>비용항목<select className="block w-full border p-2" name="cost_class" defaultValue={prior?.data.cost_class ?? ""}><option value="">선택</option><option value="selling_admin">판관비</option><option value="labor">노무비</option><option value="manufacturing">제조경비</option></select></label>
        <label>공제 구분<select className="block w-full border p-2" name="tax_type" defaultValue={prior?.data.tax_type ?? ""}><option value="">선택</option><option value="deductible">공제</option><option value="non_deductible">비공제</option></select></label>
        <label>차감 부가세(원, 비공제는 0)<input className="block w-full border p-2" type="number" step="1" name="tax_amount" defaultValue={prior?.data.tax_amount ?? ""} /></label>
      </div>
      {([["reason", "검토 사유(필수)"], ["detail_evidence", "상세 금액·귀속월 대사 근거(배부 포함 시 필수)"], ["duplicate_evidence", "기존 비용·카드 내역과 중복 해소 근거(배부 포함 시 필수)"], ["cancellation_evidence", "취소·환급 확인 근거(배부 포함 시 필수)"]] as const).map(([name, label]) => <label key={name} className="block text-sm">{label}<textarea required={name === "reason"} maxLength={2000} name={name} defaultValue={prior?.data[name] ?? ""} className="block w-full rounded border p-2" /></label>)}
      <p className="text-sm text-slate-600">원본 금액은 수정하지 않습니다. 검토자·시각과 수정 이력이 보존됩니다.</p>
      <button disabled={busy} className="rounded bg-slate-900 px-4 py-2 text-white">검토 저장</button>
      <button type="button" onClick={() => setSelected(undefined)} className="ml-3 rounded border px-4 py-2">닫기</button>
    </form>}
    <details className="rounded border p-4"><summary className="font-semibold">판매 품목 분류 및 배부 미리보기</summary>
      <p className="my-3 text-sm">카테고리 → 상품 순서로 원 단위 잔액을 배분합니다. 모든 비용 검토와 판매 원본 1개가 필요합니다. 매출 음수·0분모는 배부를 보류합니다.</p>
      <div className="grid max-h-80 gap-2 overflow-auto sm:grid-cols-2">{codes.map(code => <label key={code}>{code}<select aria-label={`${code} 카테고리`} className="ml-2 border p-2" value={mapping[code] ?? ""} onChange={e => setMapping({ ...mapping, [code]: e.target.value })}><option value="">선택</option>{categories.map(c => <option key={c}>{c}</option>)}</select></label>)}</div>
      <label className="my-3 block text-sm"><input type="checkbox" checked={zero} onChange={e => setZero(e.target.checked)} /> 검토 결과 배부 대상 비용이 0원이면 0원으로 확인</label>
      <button disabled={busy || !data} onClick={() => post({ action: "allocate", period, categories: mapping, fingerprint: data?.fingerprint, zero_confirmed: zero })} className="rounded bg-slate-900 px-4 py-2 text-white">배부 계산·기록</button>
    </details>
    {data?.allocations.filter(a => a.period === period).map(a => <article key={a.id} className="rounded border p-4"><h3 className="font-semibold">{a.period} 배부 미리보기 · {a.stale ? "입력 변경 — 재계산 필요" : "현재 입력 기준"}</h3><p className="text-sm">{a.created_at} UTC · 확정 손익 미반영</p><p className="my-2">대상 비용 {money(a.result.total)}원 / 배부 합계 {money(a.result.allocated)}원 / 차이 {money(a.result.difference)}원</p><details><summary>상품별 계산 결과</summary><div className="overflow-auto"><table className="w-full text-sm"><thead><tr><th>품목</th><th>카테고리</th><th>세전매출</th><th>배부액</th></tr></thead><tbody>{a.result.products.map(p => <tr key={p.code}><td>{p.code}</td><td>{p.category}</td><td className="text-right">{money(p.net_sales)}</td><td className="text-right">{money(p.allocated)}</td></tr>)}</tbody></table></div></details></article>)}
    <details className="rounded border p-4"><summary>최근 검토 변경 이력(200건)</summary>{data?.audit.map(r => <p key={r.id} className="border-t py-2 text-sm">#{r.id} · {r.source_row}행 · {r.data.status} · {r.actor} · {r.created_at} UTC · {r.data.reason}</p>)}</details>
  </section>;
}
