-- Leave promote notice: once per year-month
CREATE TABLE IF NOT EXISTS "leave_promote_notice_logs" (
  "id" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "postId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "leave_promote_notice_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "leave_promote_notice_logs_year_month_key"
  ON "leave_promote_notice_logs"("year", "month");
