import { redirect } from "next/navigation";

/** 근태관리 → 연차관리로 이전 */
export default function AttendanceRedirectPage() {
  redirect("/leave");
}
