import { test, expect } from "@playwright/test";

import { loginAs, loginAsAdmin } from "./helpers/auth";

async function loginDealer(page: import("@playwright/test").Page) {
  await loginAs(page, "dealer@intranet.local");
}

test.describe("Phase 8 Dealer Rollout + Part 2", () => {
  test("v2 orders API requires auth", async ({ request }) => {
    const res = await request.get("/api/v2/orders");
    expect(res.status()).toBe(401);
  });

  test("dealer cannot access HQ-only board (pr)", async ({ page }) => {
    await loginDealer(page);
    if (page.url().includes("pending=1")) {
      test.skip(true, "dealer rollout not active — enable GANGNAM001 rollout for full E2E");
    }

    await page.goto("/boards/pr");
    await expect(page.getByText("404")).toBeVisible({ timeout: 10000 }).catch(() =>
      expect(page.url()).not.toContain("/boards/pr"),
    );
  });

  test("hq can access pr board", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("이메일").fill("hq@intranet.local");
    await page.getByLabel("비밀번호").fill("password1234");
    await page.getByRole("button", { name: "로그인" }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });

    await page.goto("/boards/pr");
    await expect(page).not.toHaveURL(/404/);
  });

  test("admin can access dealer management", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto("/admin/dealers");
    await expect(page.getByRole("heading", { name: "대리점 관리" })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("대리점 Bulk Import")).toBeVisible();
  });

  test("admin rollout dashboard", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto("/admin/rollout");
    await expect(page.getByRole("heading", { name: "Rollout 대시보드" })).toBeVisible({
      timeout: 10000,
    });
  });

  test("dealer help page", async ({ page }) => {
    await loginDealer(page);

    await page.goto("/help/dealer");
    await expect(page.getByRole("heading", { name: "대리점 Quick Start" })).toBeVisible();
  });

  test("dealer v2 inventory API", async ({ request }) => {
    const login = await request.post("/api/auth/callback/credentials", {
      form: {
        email: "dealer@intranet.local",
        password: "password1234",
        csrfToken: "",
        json: "true",
      },
    });
    void login;

    const res = await request.get("/api/v2/inventory?dealerId=test");
    expect([401, 403, 422]).toContain(res.status());
  });
});
