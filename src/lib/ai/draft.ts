import "server-only";

import {
  OPENAI_API_KEY,
  OPENAI_CHAT_MODEL,
  OPENAI_BASE_URL,
} from "./config";
import { embedText } from "./embeddings";
import { hybridSearch } from "./hybrid-search";
import { sanitizeRichText } from "@/lib/sanitize";

export interface DraftRequest {
  title: string;
  purpose: string;
  templateName?: string;
}

export interface DraftResult {
  content: string;
  mode: "generative" | "fallback";
}

const SYSTEM_PROMPT = `당신은 대한민국 행정안전부의 「행정업무운영 편람」과 공문서 작성 지침을 숙지한 전문 행정문서 작성 도우미입니다.
사용자가 제시한 제목/목적에 맞는 사내 전자결재 기안서 본문을 한국어 공문체(간결·정중·객관)로 작성하세요.

작성 규칙:
- 항목을 <h2> 제목으로 구조화하고 본문은 <p> 또는 <ul><li> 로 작성합니다.
  권장 구성: 1. 기안 목적 / 2. 추진 배경 / 3. 세부 내용 / 4. 기대 효과 / 5. 협조 및 조치 사항
- 과장이나 추측 없이 사실 기반으로 작성합니다.
- 확정되지 않은 수치·일정·금액은 대괄호 자리표시자(예: [금액], [일자])로 표기합니다.
- 출력은 본문 HTML 만 반환합니다. 머리말/맺음말/코드펜스(\`\`\`)는 절대 포함하지 마세요.`;

function fallbackDraft(req: DraftRequest): string {
  const purpose = req.purpose || "[기안 목적을 입력하세요]";
  return sanitizeRichText(
    `<h2>1. 기안 목적</h2><p>${escapeText(purpose)}</p>` +
      `<h2>2. 추진 배경</h2><p>[추진 배경을 작성하세요]</p>` +
      `<h2>3. 세부 내용</h2><ul><li>[세부 내용 1]</li><li>[세부 내용 2]</li></ul>` +
      `<h2>4. 기대 효과</h2><p>[기대 효과를 작성하세요]</p>` +
      `<h2>5. 협조 및 조치 사항</h2><p>[협조 및 조치 사항을 작성하세요]</p>`,
  );
}

function escapeText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function generateWithOpenAI(
  req: DraftRequest,
  context: string,
): Promise<string> {
  const userParts = [
    `기안 제목: ${req.title || "(미정)"}`,
    req.templateName ? `문서 양식: ${req.templateName}` : "",
    `기안 목적/요청 사항: ${req.purpose}`,
    context ? `\n참고할 사내 자료:\n${context}` : "",
  ].filter(Boolean);

  const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_CHAT_MODEL,
      temperature: 0.4,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userParts.join("\n") },
      ],
    }),
  });

  if (!res.ok) throw new Error(`OpenAI 기안 생성 오류: ${res.status}`);
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error("OpenAI 응답이 비어 있습니다.");

  const cleaned = raw.replace(/^```html\s*/i, "").replace(/```$/i, "").trim();
  return sanitizeRichText(cleaned);
}

export async function generateDraft(req: DraftRequest): Promise<DraftResult> {
  // 사내 문서 컨텍스트(있으면) — 행정안전부 정책 자료를 인제스트하면 함께 활용됨
  let context = "";
  try {
    const query = `${req.title} ${req.purpose}`.trim();
    const vec = await embedText(query);
    const results = await hybridSearch(query, vec, 6);
    context = results
      .map((r, i) => `[${i + 1}] ${r.title ?? ""}\n${r.content}`)
      .join("\n\n");
  } catch (e) {
    console.error("[ai/draft] 컨텍스트 검색 실패(무시):", e);
  }

  if (OPENAI_API_KEY) {
    try {
      const content = await generateWithOpenAI(req, context);
      return { content, mode: "generative" };
    } catch (e) {
      console.error("[ai/draft] 생성 실패, 폴백:", e);
    }
  }

  return { content: fallbackDraft(req), mode: "fallback" };
}
