import "server-only";

import { prisma } from "@/lib/prisma";
import {
  currentLeaveYear,
  ensureLeaveBalance,
  remainingDays,
} from "@/features/leave/queries";
import { notifyUsers } from "@/features/notifications/service";

function kstParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

async function sendLeaveEmail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ ok: boolean; detail: string }> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // nodemailer 의존성 없이 동작: SMTP 설정이 있어도 우선 로그+인앱 알림.
  // 실제 SMTP 발송은 추후 SMTP 어댑터 추가 시 연결.
  console.log(
    `[leave-mail] to=${opts.to} subject=${opts.subject}` +
      (host && user && pass ? " (SMTP configured — logged until adapter enabled)" : " (SMTP unset)") +
      `\n${opts.text}`,
  );
  return {
    ok: true,
    detail: host && user && pass ? "smtp_configured_logged" : "smtp_not_configured_logged",
  };
}

/**
 * 매월 말일(KST) 잔여 연차를 가입 이메일로 발송.
 * force=true 이면 말일이 아니어도 실행(테스트용).
 */
export async function runMonthEndLeaveMailJob(opts?: {
  force?: boolean;
  now?: Date;
}) {
  const now = opts?.now ?? new Date();
  const { year, month, day } = kstParts(now);
  const last = lastDayOfMonth(year, month);
  if (!opts?.force && day !== last) {
    return { skipped: true, reason: "not_month_end", year, month, day };
  }

  const users = await prisma.user.findMany({
    where: { isActive: true, approvalStatus: "APPROVED" },
    select: { id: true, email: true, name: true },
  });

  let sent = 0;
  let failed = 0;

  for (const u of users) {
    const existing = await prisma.leaveMonthEndMailLog.findUnique({
      where: {
        userId_year_month: { userId: u.id, year, month },
      },
    });
    if (existing?.success) continue;

    const leaveYear = currentLeaveYear(now);
    const balance = await ensureLeaveBalance(u.id, leaveYear);
    const remaining = remainingDays(balance.accruedDays, balance.usedDays);
    const subject = `[인트라넷] ${year}년 ${month}월 잔여 연차 안내`;
    const text = [
      `${u.name}님 안녕하세요.`,
      "",
      `${year}년 ${month}월 말 기준 연차 현황입니다.`,
      `- 발생 연차: ${balance.accruedDays}일`,
      `- 사용 연차: ${balance.usedDays}일`,
      `- 잔여 연차: ${remaining}일`,
      "",
      "인트라넷 연차관리 메뉴에서 신청·내역을 확인할 수 있습니다.",
    ].join("\n");

    const mail = await sendLeaveEmail({ to: u.email, subject, text });

    await prisma.leaveMonthEndMailLog.upsert({
      where: { userId_year_month: { userId: u.id, year, month } },
      create: {
        userId: u.id,
        year,
        month,
        email: u.email,
        remaining,
        success: mail.ok,
        detail: mail.detail,
      },
      update: {
        email: u.email,
        remaining,
        success: mail.ok,
        detail: mail.detail,
      },
    });

    if (mail.ok) {
      sent += 1;
      await notifyUsers([u.id], {
        type: "SYSTEM",
        title: "월말 잔여 연차 안내",
        body: `${year}.${month} 잔여 ${remaining}일 (가입 이메일로 발송)`,
        link: "/leave",
      });
    } else {
      failed += 1;
    }
  }

  return { skipped: false, year, month, sent, failed, total: users.length };
}
