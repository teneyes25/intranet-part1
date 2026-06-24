import { test, expect } from "@playwright/test";

import { loginAsAdmin } from "./helpers/auth";

test.describe("Phase 4 feature checks", () => {
  test("PWA manifest and service worker", async ({ request }) => {
    const manifest = await request.get("/manifest.webmanifest");
    expect(manifest.ok()).toBeTruthy();
    const body = await manifest.json();
    expect(body.display).toBe("standalone");
    expect(body.lang).toBe("ko");

    const sw = await request.get("/sw.js");
    expect(sw.ok()).toBeTruthy();
  });

  test("notifications API requires auth", async ({ request }) => {
    const res = await request.get("/api/notifications");
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("로그인");
  });

  test("dashboard chart after login (Korean UI)", async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByText("주간 활동")).toBeVisible();
    await expect(page.getByText("안녕하세요")).toBeVisible();
  });

  test("AI agent file attach control visible", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/ai-agent");
    await expect(page.getByText("Hybrid RAG")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "파일 첨부" })).toBeVisible();
    await expect(page.getByLabel("AI 질문 입력")).toBeVisible();
  });
});
