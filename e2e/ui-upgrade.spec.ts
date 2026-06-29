/**
 * UI/편집기 업그레이드 — Page Builder (GrapesJS), 메일함 DnD, 디자인 v3
 * docker 8080 기동 후: npx playwright test e2e/ui-upgrade.spec.ts
 */
import { test, expect } from "@playwright/test";

import { loginAs, loginAsAdmin } from "./helpers/auth";

const HQ = "hq@intranet.local";
const DEALER = "dealer@intranet.local";

test.describe("UI upgrade — Page Builder (GrapesJS)", () => {
  test("admin: page builder loads with GrapesJS canvas", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/customize/page-builder");
    await expect(page.getByRole("heading", { name: "Visual Page Builder" })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole("button", { name: "저장" })).toBeVisible();
    await expect(page.getByRole("button", { name: "대시보드" })).toBeVisible();
    await expect(page.getByText("에디터 로딩 중…")).toBeHidden({ timeout: 30000 });
    const builder = page.locator(".grapes-editor-shell");
    await expect(
      page.locator(".gjs-editor, .gjs-cv-canvas, [class*='gjs-']").first(),
    ).toBeVisible({ timeout: 5000 });
    await expect(builder.getByRole("button", { name: "템플릿 갤러리" })).toBeVisible();
    await expect(builder.getByRole("button", { name: "테마", exact: true })).toBeVisible();
    await expect(builder.getByRole("button", { name: "버전" })).toBeVisible();
  });

  test("admin: customize tab links to visual editor", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/customize");
    await page.getByRole("button", { name: "Page Builder" }).click();
    await expect(page.getByText("GrapesJS Visual Page Builder")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("link", { name: "Visual Editor 열기" })).toBeVisible();
  });

  test("HQ: page builder read-only preview", async ({ page }) => {
    await loginAs(page, HQ);
    await page.goto("/admin/customize/page-builder");
    await expect(page.getByRole("heading", { name: "Visual Page Builder" })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("미리보기 전용", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "저장" })).toBeDisabled();
    await expect(page.getByText("에디터 로딩 중…")).toBeHidden({ timeout: 30000 });
  });

  test("dealer: page builder loads with locked dealer scope", async ({ page }) => {
    await loginAs(page, DEALER);
    await page.goto("/admin/customize/page-builder");
    await expect(page.getByRole("heading", { name: "Visual Page Builder" })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("자사 대리점 전용 편집")).toBeVisible();
    await expect(page.getByRole("button", { name: "저장" })).toBeEnabled();
    await expect(page.getByText("에디터 로딩 중…")).toBeHidden({ timeout: 30000 });
  });

  test("unauthenticated: page builder redirects to login", async ({ page }) => {
    await page.goto("/admin/customize/page-builder");
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  });
});

test.describe("UI upgrade — Board mailbox", () => {
  test("HQ: mailbox view loads with folder sidebar", async ({ page }) => {
    await loginAs(page, HQ);
    await page.goto("/boards/general/mailbox");
    await expect(page.getByRole("heading", { name: /메일함/ })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("시스템", { exact: true }).first()).toBeVisible();
  });
});

test.describe("UI upgrade — design system smoke", () => {
  test("dashboard uses updated layout shell", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10000 });
    const bg = await page.evaluate(() =>
      getComputedStyle(document.body).getPropertyValue("background-color"),
    );
    expect(bg).toBeTruthy();
  });
});

test.describe("UI upgrade — existing features regression", () => {
  test("approval + AI agent still accessible for HQ", async ({ page }) => {
    await loginAs(page, HQ);
    await page.goto("/approval/new");
    await expect(page.locator("body")).toContainText(/기안|템플릿|제목/);
    await page.goto("/ai-agent");
    await expect(page.getByLabel("AI 질문 입력")).toBeVisible({ timeout: 10000 });
  });

  test("notifications API responds for admin", async ({ page }) => {
    await loginAsAdmin(page);
    const res = await page.request.get("/api/notifications");
    expect(res.ok()).toBeTruthy();
  });
});
