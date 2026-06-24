import { redirect } from "next/navigation";

/** 이전 '찾아오기' 경로 → 통합 검색으로 리다이렉트 */
export default function DirectionsRedirect() {
  redirect("/search");
}
