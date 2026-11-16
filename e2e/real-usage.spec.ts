/**
 * Day 36 — 실사용 테스트
 * docker compose up -d 후: npm run test:real-usage
 */
import { test, expect } from "@playwright/test";

import { loginAs, loginAsAdmin, DEFAULT_PASSWORD } from "./helpers/auth";

const HQ = "hq@intranet.local";
const DEALER = "dealer@intranet.local";

test.describe("Day 36 Real usage — core flows", () => {
  test("admin / hq / dealer login", async ({ page }) => {
    test.setTimeout(120_000);
    await loginAsAdmin(page);
    await expect(page.getByText("주간 활동")).toBeVisible({ timeout: 10000 });

    await page.context().clearCookies();
    await loginAs(page, HQ);
    await expect(page).toHaveURL(/dashboard/);

    await page.context().clearCookies();
    await loginAs(page, DEALER);
    await expect(page).toHaveURL(/dashboard|help\/dealer/, { timeout: 20000 });
  });

  test("HQ: dashboard → notice board → write page", async ({ page }) => {
    await loginAs(page, HQ);
    await page.goto("/boards/notices");
    await expect(page.locator("body")).toContainText(/공지|총/);
    await page.goto("/boards/notices/new");
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("HQ: AI agent — file attach + chat input", async ({ page }) => {
    await loginAs(page, HQ);
    await page.goto("/ai-agent");
    await expect(page.getByRole("button", { name: "파일 첨부" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel("AI 질문 입력")).toBeVisible();
  });

  test("HQ: approval new + template list", async ({ page }) => {
    await loginAs(page, HQ);
    await page.goto("/approval/new");
    await expect(page.locator("body")).toContainText(/기안|템플릿|제목/);
    await page.goto("/approval");
    await expect(page.locator("body")).toBeVisible();
  });

  test("HQ: notifications page", async ({ page }) => {
    await loginAs(page, HQ);
    await page.goto("/notifications");
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10000 });
  });

  test("Admin: customize center 5 tabs", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/customize");
    await expect(page.getByRole("heading", { name: "관리자 커스터마이징 센터" })).toBeVisible({
      timeout: 10000,
    });
    for (const tab of ["화면 디자인", "Page Builder", "AI 학습", "전자결재", "SNS 연동"]) {
      await expect(page.getByRole("button", { name: tab })).toBeVisible();
    }
  });

  test("Admin: users bulk import + rollout + monitoring", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/users");
    await expect(page.getByText("사용자 대량 등록")).toBeVisible({ timeout: 10000 });

    await page.goto("/admin/rollout");
    await expect(page.getByRole("heading", { name: "Rollout 대시보드" })).toBeVisible();

    await page.goto("/admin/monitoring");
    await expect(page.getByRole("heading", { name: "실시간 모니터링" })).toBeVisible();
  });
});

test.describe("Day 36 — Part 2 v2 API", () => {
  test("dealer creates order via API", async ({ page }) => {
    await loginAs(page, DEALER);
    if (page.url().includes("pending=1")) {
      test.skip(true, "dealer rollout inactive");
    }

    const inv = await page.request.get("/api/v2/inventory");
    expect(inv.ok()).toBeTruthy();
    const invBody = await inv.json();
    const skuId = invBody.items?.[0]?.skuId;
    expect(skuId).toBeTruthy();

    const create = await page.request.post("/api/v2/orders", {
      data: { items: [{ skuId, quantity: 1 }] },
    });
    expect(create.status()).toBe(201);
    const body = await create.json();
    expect(body.order?.orderNumber).toMatch(/^ORD-/);

    const list = await page.request.get("/api/v2/orders");
    expect(list.ok()).toBeTruthy();
  });
});
