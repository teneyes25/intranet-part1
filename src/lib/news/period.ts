import type { NewsPeriod } from "@/lib/news/mindmap-types";

export type { NewsPeriod };

const TZ = process.env.NEWS_TIMEZONE ?? "Asia/Seoul";

const WEEKDAY_OFFSET: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function kstYmd(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function kstParts(now = new Date()): { y: number; m: number; d: number } {
  const bits = kstYmd(now).split("-");
  return {
    y: Number(bits[0]),
    m: Number(bits[1]),
    d: Number(bits[2]),
  };
}

/** KST 시각을 UTC Date로 (한국은 DST 없음) */
export function kstDate(
  y: number,
  m: number,
  d: number,
  h = 0,
  min = 0,
  s = 0,
) {
  return new Date(Date.UTC(y, m - 1, d, h - 9, min, s));
}

export function startOfKstDay(y: number, m: number, d: number) {
  return kstDate(y, m, d, 0, 0, 0);
}

export function endOfKstDay(y: number, m: number, d: number) {
  return kstDate(y, m, d, 23, 59, 59);
}

function addDays(y: number, m: number, d: number, delta: number) {
  const utc = Date.UTC(y, m - 1, d + delta);
  const nd = new Date(utc);
  return { y: nd.getUTCFullYear(), m: nd.getUTCMonth() + 1, d: nd.getUTCDate() };
}

function kstWeekday(now = new Date()): number {
  const key = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
  }).format(now);
  return WEEKDAY_OFFSET[key] ?? 0;
}

function periodOf(
  fromYmd: { y: number; m: number; d: number },
  toYmd: { y: number; m: number; d: number },
  label: string,
): NewsPeriod {
  return {
    from: startOfKstDay(fromYmd.y, fromYmd.m, fromYmd.d),
    to: endOfKstDay(toYmd.y, toYmd.m, toYmd.d),
    label,
  };
}

function lastDayOfMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function mondayOfWeek(now: Date) {
  const today = kstParts(now);
  const sinceMon = (kstWeekday(now) + 6) % 7;
  return addDays(today.y, today.m, today.d, -sinceMon);
}

/** 기간이 명시되지 않으면 최근 7일 */
export function defaultNewsPeriod(now = new Date()): NewsPeriod {
  const today = kstParts(now);
  const from = addDays(today.y, today.m, today.d, -6);
  return periodOf(from, today, "최근 7일");
}

/**
 * 「지난주」「8월」「3월 1일부터 15일」등 한국어 기간을 파싱한다.
 * 기간이 없으면 null.
 */
export function parseNewsPeriod(
  question: string,
  now = new Date(),
): NewsPeriod | null {
  const q = question.replace(/\s+/g, " ").trim();
  const today = kstParts(now);

  if (/(오늘|금일)/.test(q)) {
    return periodOf(today, today, "오늘");
  }
  if (/어제/.test(q)) {
    const y = addDays(today.y, today.m, today.d, -1);
    return periodOf(y, y, "어제");
  }
  if (/그제|그저께/.test(q)) {
    const y = addDays(today.y, today.m, today.d, -2);
    return periodOf(y, y, "그저께");
  }
  if (/이번\s*주/.test(q)) {
    const mon = mondayOfWeek(now);
    return periodOf(mon, today, "이번 주");
  }
  if (/지난\s*주|저번\s*주/.test(q)) {
    const thisMon = mondayOfWeek(now);
    const lastMon = addDays(thisMon.y, thisMon.m, thisMon.d, -7);
    const lastSun = addDays(thisMon.y, thisMon.m, thisMon.d, -1);
    return periodOf(lastMon, lastSun, "지난주");
  }
  if (/이번\s*달|이달/.test(q)) {
    return periodOf(
      { y: today.y, m: today.m, d: 1 },
      today,
      `${today.y}년 ${today.m}월`,
    );
  }
  if (/지난\s*달|전달|저번\s*달/.test(q)) {
    const pm = today.m === 1 ? 12 : today.m - 1;
    const py = today.m === 1 ? today.y - 1 : today.y;
    return periodOf(
      { y: py, m: pm, d: 1 },
      { y: py, m: pm, d: lastDayOfMonth(py, pm) },
      `${py}년 ${pm}월`,
    );
  }

  const recent = q.match(/최근\s*(\d{1,3})\s*일/);
  if (recent) {
    const n = Math.min(90, Math.max(1, Number(recent[1])));
    const from = addDays(today.y, today.m, today.d, -(n - 1));
    return periodOf(from, today, `최근 ${n}일`);
  }

  const iso = q.match(
    /(\d{4})-(\d{1,2})-(\d{1,2})\s*(?:~|부터|-|—)\s*(\d{4})-(\d{1,2})-(\d{1,2})/,
  );
  if (iso) {
    const a = {
      y: Number(iso[1]),
      m: Number(iso[2]),
      d: Number(iso[3]),
    };
    const b = {
      y: Number(iso[4]),
      m: Number(iso[5]),
      d: Number(iso[6]),
    };
    return periodOf(a, b, `${iso[1]}-${iso[2]}-${iso[3]} ~ ${iso[4]}-${iso[5]}-${iso[6]}`);
  }

  const range = q.match(
    /(?:(\d{4})\s*년\s*)?(\d{1,2})\s*월\s*(\d{1,2})\s*일\s*(?:부터|~|-)\s*(?:(\d{4})\s*년\s*)?(\d{1,2})\s*월\s*(\d{1,2})\s*일/,
  );
  if (range) {
    const y1 = range[1] ? Number(range[1]) : today.y;
    const y2 = range[4] ? Number(range[4]) : y1;
    const a = { y: y1, m: Number(range[2]), d: Number(range[3]) };
    const b = { y: y2, m: Number(range[5]), d: Number(range[6]) };
    return periodOf(a, b, `${y1}년 ${a.m}월 ${a.d}일 ~ ${y2}년 ${b.m}월 ${b.d}일`);
  }

  const sameMonth = q.match(
    /(?:(\d{4})\s*년\s*)?(\d{1,2})\s*월\s*(\d{1,2})\s*일\s*(?:부터|~|-)\s*(\d{1,2})\s*일/,
  );
  if (sameMonth) {
    const y = sameMonth[1] ? Number(sameMonth[1]) : today.y;
    const m = Number(sameMonth[2]);
    const a = { y, m, d: Number(sameMonth[3]) };
    const b = { y, m, d: Number(sameMonth[4]) };
    return periodOf(a, b, `${y}년 ${m}월 ${a.d}일 ~ ${b.d}일`);
  }

  const month = q.match(/(?:(\d{4})\s*년\s*)?(\d{1,2})\s*월(?!\s*\d)/);
  if (month) {
    let y = month[1] ? Number(month[1]) : today.y;
    const m = Number(month[2]);
    if (!month[1] && m > today.m) y -= 1;
    const toD =
      y === today.y && m === today.m ? today.d : lastDayOfMonth(y, m);
    return periodOf({ y, m, d: 1 }, { y, m, d: toD }, `${y}년 ${m}월`);
  }

  return null;
}

const KEYWORD_STOP =
  /마인드\s*맵|마인드맵|트리|지도|구조화|그려\s*줘|그려줘|그려|만들어\s*줘|만들어|정리|해줘|해 줘|좀|기간별|뉴스|기사|요약|동향|알려줘|보여줘|부탁|오늘|어제|그제|그저께|이번\s*주|지난\s*주|저번\s*주|이번\s*달|지난\s*달|저번\s*달|이달|전달|최근\s*\d+\s*일|\d{4}\s*년|\d{1,2}\s*월|\d{1,2}\s*일|부터|까지|~|—/g;

/** 기간·명령 표현을 뺀 뒤 남는 검색어 (침구, 정치 등) */
export function extractNewsKeyword(question: string): string | undefined {
  const cleaned = question
    .replace(KEYWORD_STOP, " ")
    .replace(/[?!.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length < 2 || cleaned.length > 40) return undefined;
  return cleaned;
}

export function looksLikeNewsMindmap(question: string): boolean {
  const q = question.replace(/\s+/g, " ");
  return (
    /마인드\s*맵|마인드맵/.test(q) ||
    /(뉴스|기사).{0,12}(트리|지도|구조)/.test(q) ||
    /(트리|지도|구조).{0,12}(뉴스|기사)/.test(q) ||
    /기간별.{0,8}뉴스/.test(q)
  );
}
