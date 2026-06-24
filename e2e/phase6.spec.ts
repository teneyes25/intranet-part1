import { test, expect } from "@playwright/test";

import { loginAsAdmin } from "./helpers/auth";

test.describe("Phase 6 Pilot deployment", () => {
  test("pilot metrics API requires admin", async ({ request }) => {
    const res = await request.get("/api/pilot/metrics");
    expect(res.status()).toBe(401);
  });

  test("pilot feedback API rejects unauthenticated", async ({ request }) => {
    const res = await request.post("/api/pilot/feedback", {
      data: {
        category: "bug",
        rating: 3,
        message: "테스트 피드백입니다.",
      },
    });
    expect(res.status()).toBe(401);
  });

  test("admin can access pilot management", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/pilot");
    await expect(page.getByRole("heading", { name: "Pilot 배포 관리" })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole("button", { name: "Pilot 설정" })).toBeVisible();
    await expect(page.getByRole("button", { name: "모니터링" })).toBeVisible();
  });

  test("admin pilot settings page loads", async ({ page }) => {
    test.setTimeout(60000);
    await loginAsAdmin(page);
    await page.goto("/admin/pilot");
    await page.getByRole("button", { name: "Pilot 설정" }).click();
    await expect(page.getByText("Pilot 모드 설정")).toBeVisible({ timeout: 10000 });
  });
});
