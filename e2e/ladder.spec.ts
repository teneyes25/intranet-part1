import { test, expect } from "@playwright/test";

test.describe("12명 사다리 게임", () => {
  test("로그인 없이 12명 사다리가 열린다", async ({ page }) => {
    await page.goto("/ladder");

    await expect(
      page.getByRole("heading", { name: "12명 사다리 게임" }),
    ).toBeVisible();
    await expect(page.getByText("참가 12명 고정")).toBeVisible();
    await expect(page.getByRole("img", { name: "12명 사다리" })).toBeVisible();

    for (let i = 1; i <= 12; i++) {
      await expect(page.getByLabel(`참가자 ${i} 이름`, { exact: true })).toBeVisible();
      await expect(page.getByLabel(`결과 칸 ${i}`, { exact: true })).toBeVisible();
    }
  });

  test("한 명이 사다리를 타면 매칭 결과가 나타난다", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/ladder");

    await page.getByLabel("참가자 1 이름").fill("민수");
    await page.getByRole("button", { name: "민수 타기" }).click();

    await expect(page.getByTestId("ladder-results")).toBeVisible({
      timeout: 8000,
    });
    await expect(page.getByTestId("ladder-results")).toContainText("민수");
    await expect(page.getByText("1명의 결과가 공개되었습니다.")).toBeVisible();
  });

  test("전체 결과를 보면 12명 매칭이 모두 공개된다", async ({ page }) => {
    await page.goto("/ladder");
    await page.getByRole("button", { name: "전체 결과" }).click();

    const items = page.getByTestId("ladder-results").locator("li");
    await expect(items).toHaveCount(12);
    await expect(page.getByText("12명의 결과가 공개되었습니다.")).toBeVisible();
  });
});
