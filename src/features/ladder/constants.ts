export const PLAYER_COUNT = 12;
export const RUNG_ROWS = 18;

export const PLAYER_COLORS = [
  "#2563EB",
  "#DC2626",
  "#059669",
  "#D97706",
  "#7C3AED",
  "#DB2777",
  "#0891B2",
  "#65A30D",
  "#EA580C",
  "#4F46E5",
  "#0D9488",
  "#BE185D",
] as const;

export const DEFAULT_NAMES = Array.from(
  { length: PLAYER_COUNT },
  (_, i) => `참가자 ${i + 1}`,
);

export const RESULT_PRESETS = {
  default: {
    label: "회식·이벤트",
    values: [
      "커피 쏘기",
      "점심 메뉴 결정권",
      "자리 청소",
      "간식 당첨",
      "다음 회의 진행",
      "꽝",
      "칭찬 한 스푼",
      "조기 퇴근 추천",
      "팀 간식 선택",
      "발표 1번",
      "꽝",
      "오늘의 주인공",
    ],
  },
  lunch: {
    label: "점심 메뉴",
    values: [
      "김치찌개",
      "된장찌개",
      "비빔밥",
      "제육볶음",
      "칼국수",
      "돈까스",
      "초밥",
      "쌀국수",
      "햄버거",
      "샐러드",
      "짜장면",
      "오늘의 백반",
    ],
  },
  duty: {
    label: "당번",
    values: [
      "청소 당번",
      "커피 당번",
      "회의실 세팅",
      "쓰레기 배출",
      "간식 구매",
      "화분 물주기",
      "택배 정리",
      "화이트보드 지우기",
      "출입문 마감",
      "회식 장소 예약",
      "다음 주 당번장",
      "자유 패스",
    ],
  },
  prize: {
    label: "선물 / 꽝",
    values: [
      "1등 상품",
      "2등 상품",
      "3등 상품",
      "꽝",
      "꽝",
      "꽝",
      "보너스 간식",
      "꽝",
      "꽝",
      "커피 쿠폰",
      "꽝",
      "히든 상품",
    ],
  },
  numbered: {
    label: "번호만",
    values: Array.from({ length: PLAYER_COUNT }, (_, i) => `결과 ${i + 1}`),
  },
} as const;

export type ResultPresetKey = keyof typeof RESULT_PRESETS;

export const DEFAULT_RESULTS = [...RESULT_PRESETS.default.values];
