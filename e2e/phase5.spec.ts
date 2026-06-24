import { test, expect } from "@playwright/test";

import { loginAsAdmin } from "./helpers/auth";

test.describe("Phase 5 customize center", () => {
  test("customize page requires login", async ({ page }) => {
    await page.goto("/admin/customize");
    await expect(page).toHaveURL(/login/);
  });

  test("AI ingest API requires admin auth", async ({ request }) => {
    const res = await request.post("/api/ai/ingest", {
      data: { scope: "all" },
    });
    expect(res.status()).toBe(401);
  });

  test("branding asset rejects invalid type", async ({ request }) => {
    const res = await request.get("/api/branding/asset?asset=invalid");
    expect(res.status()).toBe(400);
  });

  test("admin can access customize center with 4 tabs", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto("/admin/customize");
    await expect(
      page.getByRole("heading", { name: "관리자 커스터마이징 센터" }),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("navigation", { name: "커스터마이징 탭" })).toBeVisible();
    await expect(page.getByRole("button", { name: "화면 디자인" })).toBeVisible();
    await expect(page.getByRole("button", { name: "AI 학습" })).toBeVisible();
    await expect(page.getByRole("button", { name: "전자결재" })).toBeVisible();
    await expect(page.getByRole("button", { name: "SNS 연동" })).toBeVisible();
  });

  test("customize tabs switch content", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/customize");

    await page.getByRole("button", { name: "AI 학습" }).click();
    await expect(page.getByText("Vector DB 재학습")).toBeVisible();

    await page.getByRole("button", { name: "SNS 연동" }).click();
    await expect(page.getByText("공지 자동 게시 (Phase 2 예정)")).toBeVisible();
  });
});
