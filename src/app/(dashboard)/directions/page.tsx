import { redirect } from "next/navigation";

/** 이전 '찾아오기' 경로 → 매장 찾기 */
export default function DirectionsRedirect() {
  redirect("/stores");
}
