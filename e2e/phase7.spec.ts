import { test, expect } from "@playwright/test";

import { loginAsAdmin } from "./helpers/auth";

test.describe("Phase 7 Production readiness", () => {
  test("production mode: dashboard loads for admin", async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByText("주간 활동")).toBeVisible();
  });

  test("admin can access system dashboard", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/system");
    await expect(page.getByRole("heading", { name: "시스템 상태" })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole("button", { name: "긴급 공지 발송" })).toBeVisible();
  });

  test("admin users page has bulk import", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/users");
    await expect(page.getByText("사용자 대량 등록")).toBeVisible({ timeout: 10000 });
  });

  test("help page has manual download link", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/help");
    await expect(page.getByRole("link", { name: /매뉴얼 다운로드/ })).toBeVisible();
  });

  test("health API returns ok", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe("healthy");
  });
});
