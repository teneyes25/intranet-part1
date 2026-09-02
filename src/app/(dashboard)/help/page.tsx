import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  Bot,
  FileCheck2,
  HelpCircle,
  Megaphone,
  PlayCircle,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "도움말",
};

const SECTIONS = [
  {
    icon: Megaphone,
    title: "게시판 · 공지 · 일정",
    items: [
      "공지사항은 상단 고정 글이 먼저 표시됩니다.",
      "일반 게시판에서 글 작성·수정·삭제가 가능합니다 (본인 글 또는 ADMIN).",
      "일정 게시판은 달력으로 회의·행사·마감을 확인할 수 있습니다.",
      "뉴스 게시판은 시스템 관리자 로그인 시 하루 1회 AI가 자동 수집합니다.",
    ],
  },
  {
    icon: FileCheck2,
    title: "전자결재",
    items: [
      "기안서 작성 시 AI 기안 지원으로 행정안전부 공문체 초안을 생성할 수 있습니다.",
      "결재선을 지정하고 상신하면 결재자에게 알림이 전송됩니다.",
      "결재 완료 문서는 문서함에 자동 보관됩니다.",
    ],
  },
  {
    icon: Bot,
    title: "AI 에이전트",
    items: [
      "사내 게시글·문서를 RAG 검색하여 근거와 함께 답변합니다.",
      "「최신 뉴스 요약」「유사 사례 찾아줘」 등 자연어 질의를 지원합니다.",
      "대화 히스토리는 서버에 저장되어 맥락을 유지합니다.",
    ],
  },
];

const VIDEO_PLACEHOLDERS = [
  { title: "로그인 & 대시보드 둘러보기", duration: "2:30" },
  { title: "전자결재 기안·결재 흐름", duration: "3:15" },
  { title: "AI 에이전트 사용법", duration: "2:45" },
];

export default async function HelpPage() {
  const user = await requireUser();

  return (
    <div>
      <PageHeader title="헬프 센터" description="인트라넷 주요 기능 사용법" />

      <div className="mb-6 rounded-xl border bg-muted/30 p-4 text-sm">
        <p className="flex items-center gap-2 font-medium">
          <HelpCircle className="h-4 w-4 text-primary" />
          상세 매뉴얼: USER_MANUAL.md · ADMIN_MANUAL.md
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <a href="/api/help/manual" download>
              <BookOpen className="h-4 w-4" />
              사용자 매뉴얼 다운로드 (Markdown)
            </a>
          </Button>
          {user.role === "ADMIN" && (
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/customize">브랜딩 설정 가이드 → 커스터마이징</Link>
            </Button>
          )}
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">온보딩 체크리스트</CardTitle>
          <CardDescription>신규 직원 시작 가이드</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
            <li>회원가입 후 관리자 승인 · 로그인</li>
            <li>최초 로그인 시 비밀번호 변경</li>
            <li>대시보드·공지사항·게시판 둘러보기</li>
            <li>전자결재 기안·결재 흐름 실습</li>
            <li>문제 발생 시 관리자 또는 IT 헬프데스크 연락</li>
          </ol>
        </CardContent>
      </Card>

      <div className="mb-6">
        <h3 className="mb-3 text-sm font-semibold">교육 동영상 (준비 중)</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {VIDEO_PLACEHOLDERS.map((v) => (
            <Card key={v.title} className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <PlayCircle className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm font-medium">{v.title}</p>
                <Badge variant="outline">{v.duration}</Badge>
                <p className="text-xs text-muted-foreground">영상 업로드 예정</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.title} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="h-4 w-4 text-primary" />
                  {s.title}
                </CardTitle>
                <CardDescription>빠른 가이드</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
                  {s.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-primary" />
              관리자
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              회원가입 승인, 역할 지정, 커스터마이징, 활동 로그는 ADMIN 메뉴에서
              관리합니다.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
