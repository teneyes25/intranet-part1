import type { Metadata } from "next";

import { LadderGame } from "@/features/ladder/components/ladder-game";

export const metadata: Metadata = {
  title: "사다리 게임",
  description: "12명이 참여하는 사다리타기. 이름을 누르고 결과를 확인하세요.",
};

export default function LadderPage() {
  return <LadderGame />;
}
