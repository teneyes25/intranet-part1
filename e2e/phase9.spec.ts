import { test, expect } from "@playwright/test";

import { loginAs, loginAsAdmin } from "./helpers/auth";

const HQ = { email: "hq@intranet.local", password: "password1234" };
const DEALER = { email: "dealer@intranet.local", password: "password1234" };

test.describe("Phase 9 Full integration", () => {
  test("HQ flow: dashboard → boards → approval → AI", async ({ page }) => {
    await loginAs(page, HQ.email, HQ.password);
    await page.goto("/boards/notices");
    await expect(page.locator("body")).toContainText(/공지|게시|총/, { timeout: 10000 });

    await page.goto("/approval");
    await expect(page.locator("body")).toBeVisible();

    await page.goto("/ai-agent");
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10000 });
  });

  test("Dealer flow: products OK, pr blocked", async ({ page }) => {
    await loginAs(page, DEALER.email, DEALER.password);
    if (page.url().includes("pending=1")) {
      test.skip(true, "dealer rollout not active — enable GANGNAM001 rollout for full E2E");
    }

    await page.goto("/boards/products");
    await expect(page).not.toHaveURL(/404/);

    await page.goto("/boards/pr");
    await expect(
      page.getByRole("heading", { name: "404" }).or(page.getByText("페이지를 찾을 수 없")),
    ).toBeVisible({ timeout: 10000 });
  });

  test("Admin: monitoring + rollout + dealers", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/monitoring");
    await expect(page.getByRole("heading", { name: "실시간 모니터링" })).toBeVisible({
      timeout: 10000,
    });

    await page.goto("/admin/rollout");
    await expect(page.getByRole("heading", { name: "Rollout 대시보드" })).toBeVisible();

    await page.goto("/admin/dealers");
    await expect(page.getByRole("heading", { name: "대리점 관리" })).toBeVisible();
  });

  test("Part 2 v2 API auth gate", async ({ request }) => {
    expect((await request.get("/api/v2/orders")).status()).toBe(401);
    expect((await request.get("/api/v2/inventory")).status()).toBe(401);
    expect((await request.get("/api/admin/monitoring")).status()).toBe(401);
  });

  test("health + security baseline", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    expect(res.headers()["x-frame-options"]).toBeTruthy();
  });
});
