import type { Metadata } from "next";
import Link from "next/link";
import { Package, FileCheck2, Store, HelpCircle } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "대리점 도움말",
};

const TRAINING_CHECKLIST = [
  { title: "로그인·비밀번호", duration: "5분", desc: "최초 로그인 후 비밀번호 변경" },
  { title: "공지·상품자료", duration: "10분", desc: "본사 공지 확인, 상품자료실 탐색" },
  { title: "전자결재", duration: "10분", desc: "기안서 작성 → 결재선 → 상신" },
  { title: "AI 에이전트", duration: "5분", desc: "사내 자료 검색 질의" },
];

const STEPS = [
  "1. 관리자가 Rollout 활성화 후 로그인 (최초 비밀번호 변경)",
  "2. 공지사항·상품자료실에서 본사 자료 확인",
  "3. 전자결재 기안·결재 흐름 실습",
  "4. Part 2 API — 주문·재고·대리점 간 거래 (/api/v2)",
  "5. 문제 발생 시 Rollout 피드백 또는 본사 IT 연락",
];

export default async function HelpDealerPage({
  searchParams,
}: {
  searchParams: Promise<{ pending?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const pending = sp.pending === "1";

  return (
    <div>
      <PageHeader
        title="대리점 Quick Start"
        description={`${user.dealerName ?? "대리점"} 사용자 온보딩 가이드`}
      />

      {pending && (
        <Card className="mb-6 border-amber-500/40 bg-amber-500/10">
          <CardHeader>
            <CardTitle className="text-base text-amber-800">
              Rollout 대기 중
            </CardTitle>
            <CardDescription>
              소속 대리점의 Rollout이 아직 활성화되지 않았습니다. 본사 관리자에게
              활성화를 요청하세요.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">30분 교육 체크리스트</CardTitle>
          <CardDescription>대리점 Rollout 교육 세션용</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 sm:grid-cols-2">
            {TRAINING_CHECKLIST.map((t) => (
              <li key={t.title} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">
                  {t.title}{" "}
                  <span className="text-xs text-muted-foreground">({t.duration})</span>
                </p>
                <p className="text-muted-foreground">{t.desc}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">빠른 시작 (5단계)</CardTitle>
          <CardDescription>Rollout 활성화 후 첫 사용 순서</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
            {STEPS.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4" />
              상품자료실
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline">
              <Link href="/boards/products">바로가기</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileCheck2 className="h-4 w-4" />
              전자결재
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline">
              <Link href="/approval">바로가기</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Store className="h-4 w-4" />
              Part 2 API
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            GET /api/v2/orders · /inventory · /trades
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Button asChild variant="link">
          <Link href="/help">
            <HelpCircle className="h-4 w-4" />
            전체 헬프 센터
          </Link>
        </Button>
      </div>
    </div>
  );
}
