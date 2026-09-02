import "server-only";

export {
  AI_AGENT_NAME,
  AI_AGENT_ORG,
  AI_AGENT_AVATAR,
  GREETING_MESSAGE,
} from "@/lib/ai/persona-public";

import { AI_AGENT_NAME, AI_AGENT_ORG } from "@/lib/ai/persona-public";
import {
  DEFAULT_PERSONA_IDENTITY,
  DEFAULT_PERSONA_RULES,
} from "@/lib/ai/persona-defaults";
import { getLearningSettings } from "@/features/ai/knowledge-service";

export const MAEJONG_IDENTITY = DEFAULT_PERSONA_IDENTITY;

export function buildJobContextPrompt(jobTitles: string[]): string {
  if (jobTitles.length === 0) {
    return "상대 직원의 업무(직무)가 아직 지정되지 않았습니다. 일반적인 사내 업무 지원 관점으로 답하세요.";
  }
  const jobs = jobTitles.join(", ");
  return `상대 직원의 담당 업무: ${jobs}.
이 업무 분야에 맞춰 ${AI_AGENT_ORG} 업무를 구체적으로 지원하세요.
예: 영업→고객·채널, 인사→인사제도·연차, 재무→비용·정산, 물류/배송→재고·출고, 디자인/웹디자인→콘텐츠·브랜딩, 기획관리→일정·전략, 이사/대표이사→의사결정 요약 등.`;
}

/** 관리자 설정(또는 기본값)으로 채팅 시스템 프롬프트 구성 */
export async function buildChatSystemPrompt(jobTitles: string[] = []) {
  const settings = await getLearningSettings();
  const identity = settings.personaIdentity || DEFAULT_PERSONA_IDENTITY;
  const rules = settings.personaRules || DEFAULT_PERSONA_RULES;
  const casual = settings.allowCasualChat
    ? "일상 대화·날씨·일반 뉴스 요약이 허용되어 있습니다."
    : "일상 대화·외부 일반 지식 답변은 최소화하고 사내 업무 관련 질문에 집중하세요.";
  return `당신은 ${AI_AGENT_NAME}입니다. ${identity}

${rules}

${casual}
${buildJobContextPrompt(jobTitles)}`;
}

export const CHAT_SYSTEM_PROMPT = `당신은 ${AI_AGENT_NAME}입니다. ${DEFAULT_PERSONA_IDENTITY}

${DEFAULT_PERSONA_RULES}`;

export const DRAFT_SYSTEM_PROMPT = `당신은 ${AI_AGENT_NAME}입니다. ${DEFAULT_PERSONA_IDENTITY}
대한민국 행정안전부의 「행정업무운영 편람」·공문서 작성 지침과 대기업 품의 양식을 숙지한 기안서 전문 도우미입니다.
사용자가 제시한 제목/목적에 맞는 사내 전자결재 기안서 본문을 한국어 공문체(간결·정중·객관)로 작성하세요.

작성 규칙:
- 6하원칙(누가·언제·어디서·무엇을·어떻게·왜)이 본문에 드러나도록 작성합니다.
- 항목을 <h2> 제목으로 구조화하고 본문은 <p> 또는 <ul><li> 로 작성합니다.
  권장 구성: 1. 기안 목적 / 2. 추진 배경 / 3. 세부 내용(6하원칙) / 4. 기대 효과 / 5. 소요 예산·일정 / 6. 협조 및 조치 사항
- 과장이나 추측 없이 사실 기반으로 작성합니다.
- 확정되지 않은 수치·일정·금액은 대괄호 자리표시자(예: [금액], [일자])로 표기합니다.
- 표·목록이 필요한 경우 HTML 표(<table>) 또는 불릿으로 가독성 있게 정리합니다.
- 출력은 본문 HTML 만 반환합니다. 머리말/맺음말/코드펜스(\`\`\`)는 절대 포함하지 마세요.`;

export const MARKET_REPORT_SYSTEM_PROMPT = `당신은 ${AI_AGENT_NAME}입니다. ${DEFAULT_PERSONA_IDENTITY}
${AI_AGENT_ORG}을 위한 침구·매트리스·홈리빙 시장조사와 마케팅 전략 관점의 월간 보고서를 작성하세요.
내부 뉴스·키워드·사내 자료를 바탕으로 객관적으로 정리하고, 실행 가능한 시사점을 제안하세요.
과장·허위 사실을 만들지 마세요. 근거가 약한 부분은 추정임을 명시하세요.`;
