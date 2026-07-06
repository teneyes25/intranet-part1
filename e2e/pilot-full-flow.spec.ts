/**
 * Pilot Full Flow E2E — 기안 → AI/Compliance → 승인 → 문서함 → AI Chat
 * docker v1.7.0-pre+ 기동 후: npm run test:pilot-full
 */
import { test, expect } from "@playwright/test";

import { loginAs, loginAsAdmin } from "./helpers/auth";
import { requireSprint3Deployment } from "./helpers/sprint3";

const HQ = "hq@intranet.local";

test.describe("Pilot Full Flow — approval pipeline", () => {
  test.beforeAll(async ({ request }) => {
    await requireSprint3Deployment(request);
  });

  test("HQ: draft form with AI buttons", async ({ page }) => {
    test.setTimeout(120_000);
    await loginAs(page, HQ);
    await page.goto("/approval/new");

    await expect(page.getByRole("button", { name: /AI 초안 생성/ })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole("button", { name: /AI 추천 결재선/ })).toBeVisible();
  });

  test("approval · documents · search breadcrumbs", async ({ page }) => {
    test.setTimeout(120_000);
    await loginAs(page, HQ);

    await page.goto("/approval");
    await expect(page.getByLabel("breadcrumb")).toContainText("전자결재");

    await page.goto("/documents");
    await expect(page.getByLabel("breadcrumb")).toContainText("문서함");

    await page.goto("/search");
    await expect(page.getByLabel("breadcrumb")).toContainText("통합 검색");
  });

  test("documents page shows cards or empty state", async ({ page }) => {
    test.setTimeout(120_000);
    await loginAsAdmin(page);
    await page.goto("/documents");

    const docLink = page.getByRole("link").filter({ hasText: /전자결재|품의|Pilot|결재/ }).first();
    const empty = page.getByText("등록된 문서가 없습니다");
    await expect(docLink.or(empty)).toBeVisible({ timeout: 15000 });
  });

  test("AI agent accepts question", async ({ page }) => {
    test.setTimeout(120_000);
    await loginAs(page, HQ);
    await page.goto("/ai-agent");
    await expect(page.getByLabel("AI 질문 입력")).toBeVisible({ timeout: 10000 });
    await page.getByLabel("AI 질문 입력").fill("최근 전자결재 문서를 알려줘");
    await page.getByRole("button", { name: /전송|질문|보내기/ }).first().click();
    await expect(page.locator("body")).toContainText(/자료|답변|찾|모르|내부/, {
      timeout: 30000,
    });
  });

  test("Cmd+K navigates to documents", async ({ page }) => {
    test.setTimeout(90_000);
    await loginAs(page, HQ);
    await page.goto("/dashboard");
    await page.keyboard.press("Control+KeyK");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByLabel("빠른 검색").fill("문서함");
    const menuBtn = page.getByRole("button", { name: /문서함/ }).first();
    await expect(menuBtn).toBeVisible({ timeout: 5000 });
    await menuBtn.click();
    await expect(page).toHaveURL(/\/documents/, { timeout: 10000 });
  });
});

test.describe("Pilot Full Flow — admin approval", () => {
  test.beforeAll(async ({ request }) => {
    await requireSprint3Deployment(request);
  });

  test("admin approval inbox and detail", async ({ page }) => {
    test.setTimeout(120_000);
    await loginAsAdmin(page);
    await page.goto("/approval");
    await expect(page.getByText("수신함")).toBeVisible();

    const link = page.getByRole("link").filter({ hasText: /Pilot|품의|기안|테스트/ }).first();
    if (await link.isVisible().catch(() => false)) {
      await link.click();
      await expect(page).toHaveURL(/\/approval\//);
    }
  });
});
