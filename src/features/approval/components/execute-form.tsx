"use client";

import { useActionState, useRef, useState } from "react";
import { Loader2, Stamp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { executeDocumentAction, type ActionState } from "../actions";
import type { ApprovalKind } from "../kinds";

const initial: ActionState = {};

export function ExecuteForm({
  documentId,
  kind,
}: {
  documentId: string;
  kind: ApprovalKind | string;
}) {
  const [state, action, pending] = useActionState(executeDocumentAction, initial);
  const sealRef = useRef<HTMLCanvasElement>(null);
  const signRef = useRef<HTMLCanvasElement>(null);
  const [sealUrl, setSealUrl] = useState("");
  const [signUrl, setSignUrl] = useState("");
  const drawing = useRef<"seal" | "sign" | null>(null);

  function drawSeal() {
    const c = sealRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#c41e3a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(80, 80, 70, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(80, 80, 58, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#c41e3a";
    ctx.font = "bold 20px Batang, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("사용인감", 80, 80);
    setSealUrl(c.toDataURL("image/png"));
  }

  function clearCanvas(which: "seal" | "sign") {
    const c = which === "seal" ? sealRef.current : signRef.current;
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    if (which === "seal") setSealUrl("");
    else setSignUrl("");
  }

  function onDraw(e: React.PointerEvent<HTMLCanvasElement>, which: "seal" | "sign") {
    if (drawing.current !== which) return;
    const c = e.currentTarget;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const r = c.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * c.width;
    const y = ((e.clientY - r.top) / r.height) * c.height;
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>, which: "seal" | "sign") {
    drawing.current = which;
    const c = e.currentTarget;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const r = c.getBoundingClientRect();
    ctx.strokeStyle = which === "seal" ? "#c41e3a" : "#111";
    ctx.lineWidth = which === "seal" ? 3 : 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(
      ((e.clientX - r.left) / r.width) * c.width,
      ((e.clientY - r.top) / r.height) * c.height,
    );
    c.setPointerCapture(e.pointerId);
  }

  function endDraw(which: "seal" | "sign") {
    drawing.current = null;
    const c = which === "seal" ? sealRef.current : signRef.current;
    if (c) {
      if (which === "seal") setSealUrl(c.toDataURL("image/png"));
      else setSignUrl(c.toDataURL("image/png"));
    }
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="documentId" value={documentId} />
      <input type="hidden" name="sealDataUrl" value={sealUrl} />
      <input type="hidden" name="signatureDataUrl" value={signUrl} />

      <div className="flex items-center gap-2 text-sm font-medium">
        <Stamp className="h-4 w-4" />
        시행
        <span className="text-xs font-normal text-muted-foreground">
          최종 결재 후 기안자가 디지털 인감 또는 서명으로 시행합니다.
        </span>
      </div>

      {state?.error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="text-sm text-green-700">시행이 완료되었습니다.</p>
      )}

      <div>
          <Label>디지털 사용인감 {kind === "EXTERNAL_OFFICIAL" ? "(외부공문 필수)" : ""}</Label>
          <p className="mb-1 text-xs text-muted-foreground">
            자동 인감을 만들거나 직접 그리거나 이미지 파일을 올릴 수 있습니다.
          </p>
          <canvas
            ref={sealRef}
            width={160}
            height={160}
            className="mt-1 h-32 w-32 cursor-crosshair rounded border bg-white"
            onPointerDown={(e) => startDraw(e, "seal")}
            onPointerMove={(e) => onDraw(e, "seal")}
            onPointerUp={() => endDraw("seal")}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={drawSeal}>
              기본 인감 생성
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => clearCanvas("seal")}>
              지우기
            </Button>
            <input type="file" name="sealFile" accept="image/*" className="text-xs" />
          </div>
        </div>

      <div>
          <Label>발송자(책임자) 서명 {kind === "INTERNAL_OFFICIAL" ? "(내부공문 필수)" : ""}</Label>
          <canvas
            ref={signRef}
            width={360}
            height={140}
            className="mt-1 h-24 w-full max-w-sm cursor-crosshair rounded border bg-white"
            onPointerDown={(e) => startDraw(e, "sign")}
            onPointerMove={(e) => onDraw(e, "sign")}
            onPointerUp={() => endDraw("sign")}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => clearCanvas("sign")}>
              지우기
            </Button>
            <input type="file" name="signatureFile" accept="image/*" className="text-xs" />
          </div>
        </div>

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Stamp className="h-4 w-4" />}
        시행 완료
      </Button>
    </form>
  );
}
