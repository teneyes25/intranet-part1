/**
 * Frontend UX/UI Phase 4 — Pilot KPI, Sheet a11y
 * docker 8080 기동 후: npx playwright test e2e/ui-phase4.spec.ts
 */
import { test, expect } from "@playwright/test";

import { loginAsAdmin } from "./helpers/auth";

test.describe("UI Phase 4 — Pilot KPI", () => {
  test("admin dashboard shows Pilot KPI strip", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard");
    await expect(page.getByText("Pilot KPI (7일)")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("주간 활성 대리점")).toBeVisible();
    await expect(page.getByText("Page Builder 자립도")).toBeVisible();
    await expect(page.getByRole("link", { name: /상세 모니터링/ })).toBeVisible();
  });

  test("admin pilot page monitoring tab shows KPI", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/pilot");
    await page.getByRole("button", { name: "모니터링" }).click();
    await expect(page.getByText("Pilot KPI (7일)").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("AI Agent 활용")).toBeVisible();
  });

  test("pilot metrics API returns KPI summary", async ({ page }) => {
    await loginAsAdmin(page);
    const res = await page.request.get("/api/pilot/metrics");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.kpi?.kpis?.length).toBeGreaterThanOrEqual(5);
  });
});

test.describe("UI Phase 4 — Sheet a11y", () => {
  test("mobile menu sheet restores focus to menu button", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAdmin(page);
    await page.goto("/dashboard");

    const menuButton = page.getByRole("button", { name: "메뉴 열기", exact: true });
    await menuButton.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5000 });
    await expect(menuButton).toBeFocused();
  });

  test("page builder preview sheet has accessible close", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/customize/page-builder");
    await expect(page.getByText("에디터 로딩 중…")).toBeHidden({ timeout: 30000 });

    const previewBtn = page.getByRole("button", { name: "미리보기" });
    if (await previewBtn.isEnabled()) {
      await previewBtn.click();
      await expect(page.getByRole("button", { name: "미리보기 닫기" })).toBeVisible({
        timeout: 5000,
      });
      await page.getByRole("button", { name: "미리보기 닫기" }).click();
    } else {
      test.skip(true, "Preview disabled until editor has content changes");
    }
  });
});
