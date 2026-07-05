/**
 * Pilot Sprint #3 — Command Palette (Cmd/Ctrl+K) + Dashboard Activity Feed
 * docker 8080 (v1.6.3+) 기동 후: npm run test:pilot-sprint3
 */
import { test, expect, type Page } from "@playwright/test";

import { loginAs, loginAsAdmin } from "./helpers/auth";
import { requireSprint3Deployment } from "./helpers/sprint3";

const HQ = "hq@intranet.local";

test.describe("Sprint #3 — deployment gate", () => {
  test("health exposes Command Palette + Activity Feed flags", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.features?.commandPalette).toBe(true);
    expect(body.features?.activityFeed).toBe(true);
    expect(body.features?.quickSearch).toBe(true);
  });

  test("quick search API rejects unauthenticated", async ({ request }) => {
    const res = await request.get("/api/search/quick?q=test");
    expect(res.status()).toBe(401);
  });
});

async function openCommandPalette(page: Page) {
  await page.keyboard.press("Control+KeyK");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 10000 });
  await expect(page.getByLabel("빠른 검색")).toBeVisible();
  return dialog;
}

test.describe("Sprint #3 — Activity Feed", () => {
  test.beforeAll(async ({ request }) => {
    await requireSprint3Deployment(request);
  });

  test("dashboard renders activity feed widget", async ({ page }) => {
    test.setTimeout(90_000);
    await loginAsAdmin(page);
    await page.goto("/dashboard");

    const feed = page.getByTestId("activity-feed");
    await expect(feed).toBeVisible({ timeout: 15000 });
    await expect(feed.getByText("최근 활동")).toBeVisible();
    await expect(feed.getByText(/알림·감사 로그·게시 활동/)).toBeVisible();

    const rows = feed.locator("ul li");
    const empty = feed.getByText("아직 표시할 활동이 없습니다");
    await expect(rows.first().or(empty)).toBeVisible({ timeout: 10000 });
  });

  test("HQ dashboard shows activity feed", async ({ page }) => {
    test.setTimeout(90_000);
    await loginAs(page, HQ);
    await page.goto("/dashboard");
    await expect(page.getByTestId("activity-feed")).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Sprint #3 — Command Palette", () => {
  test.beforeAll(async ({ request }) => {
    await requireSprint3Deployment(request);
  });

  test("Ctrl+K opens palette with menu group", async ({ page }) => {
    test.setTimeout(90_000);
    await loginAs(page, HQ);
    await page.goto("/dashboard");

    const dialog = await openCommandPalette(page);
    await expect(dialog.getByText("메뉴", { exact: true })).toBeVisible();
    await expect(dialog.getByRole("button", { name: /전자결재|공지사항|홈/ }).first()).toBeVisible();
  });

  test("Escape closes command palette", async ({ page }) => {
    test.setTimeout(90_000);
    await loginAs(page, HQ);
    await page.goto("/dashboard");

    await openCommandPalette(page);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5000 });
  });

  test("topbar shortcut hint opens palette", async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAs(page, HQ);
    await page.goto("/dashboard");

    const hint = page.getByRole("button", { name: /빠른 검색 열기/ });
    await expect(hint).toBeVisible({ timeout: 15000 });
    await hint.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByLabel("빠른 검색")).toBeFocused();
  });

  test("search menu item navigates to approval", async ({ page }) => {
    test.setTimeout(90_000);
    await loginAs(page, HQ);
    await page.goto("/dashboard");

    await openCommandPalette(page);
    const input = page.getByLabel("빠른 검색");
    await input.fill("전자결재");

    const target = page.getByRole("button", { name: /전자결재/ }).first();
    await expect(target).toBeVisible({ timeout: 5000 });
    await target.click();

    await expect(page).toHaveURL(/\/approval/, { timeout: 10000 });
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("quick search API returns items when authenticated", async ({ page }) => {
    test.setTimeout(90_000);
    await loginAsAdmin(page);

    const res = await page.request.get("/api/search/quick?q=공지");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.items)).toBeTruthy();
  });
});

test.describe("Sprint #3 — Command Palette debounced search", () => {
  test.beforeAll(async ({ request }) => {
    await requireSprint3Deployment(request);
  });

  test("typing 2+ chars triggers quick search API", async ({ page }) => {
    test.setTimeout(90_000);
    await loginAs(page, HQ);
    await page.goto("/dashboard");

    await openCommandPalette(page);
    const input = page.getByLabel("빠른 검색");

    const quickPromise = page.waitForResponse(
      (r) => r.url().includes("/api/search/quick") && r.ok(),
      { timeout: 15000 },
    );
    await input.fill("공지");
    await quickPromise;

    await expect(page.getByRole("dialog")).toBeVisible();
  });
});
