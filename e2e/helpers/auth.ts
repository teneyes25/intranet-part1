import { expect, type Page } from "@playwright/test";

export const DEFAULT_PASSWORD = "password1234";
export const CHANGED_PASSWORD = "NewSecurePass1!";
export const ADMIN_EMAIL = "admin@intranet.local";

/** 데모/E2E — seed 후 admin은 mustChangePassword=false */
export async function loginAsAdmin(page: Page) {
  await loginAs(page, ADMIN_EMAIL, DEFAULT_PASSWORD);
}

export async function loginAs(
  page: Page,
  email: string,
  password = DEFAULT_PASSWORD,
) {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(email);
  await page.getByLabel("비밀번호").fill(password);
  await page.getByRole("button", { name: "로그인" }).click();

  const landed = await Promise.race([
    page.waitForURL(/\/dashboard/, { timeout: 15000 }).then(() => "dashboard" as const),
    page
      .waitForURL(/\/settings\/change-password/, { timeout: 15000 })
      .then(() => "change" as const),
    page
      .getByText("이메일 또는 비밀번호가 올바르지 않습니다")
      .waitFor({ timeout: 15000 })
      .then(() => "error" as const),
  ]).catch(() => "timeout" as const);

  if (landed === "change" && email === ADMIN_EMAIL) {
    await page.getByRole("textbox", { name: "현재 비밀번호" }).fill(DEFAULT_PASSWORD);
    await page.getByRole("textbox", { name: "새 비밀번호", exact: true }).fill(CHANGED_PASSWORD);
    await page.getByLabel("새 비밀번호 확인").fill(CHANGED_PASSWORD);
    await page.getByRole("button", { name: "비밀번호 변경" }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });
    return;
  }

  if (landed === "dashboard") return;
  if (email.includes("dealer") && page.url().includes("/help/dealer")) return;

  throw new Error(`login failed for ${email} (landed=${landed})`);
}
