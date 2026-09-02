import { expect, type Page } from "@playwright/test";

export const DEFAULT_PASSWORD = "password1234";
export const ADMIN_PASSWORD = "admin1234!!";
export const CHANGED_PASSWORD = "NewSecurePass1!";
export const ADMIN_EMAIL = "admin@intranet.local";

const POST_LOGIN = /\/(dashboard|settings\/change-password|help\/dealer)/;

async function completePasswordChangeIfNeeded(page: Page) {
  if (!page.url().includes("/settings/change-password")) return;

  await page.getByRole("textbox", { name: "현재 비밀번호" }).fill(DEFAULT_PASSWORD);
  await page.getByRole("textbox", { name: "새 비밀번호", exact: true }).fill(CHANGED_PASSWORD);
  await page.getByLabel("새 비밀번호 확인").fill(CHANGED_PASSWORD);
  await page.getByRole("button", { name: "비밀번호 변경" }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });
}

/** 데모/E2E — seed 후 mustChangePassword=false 권장 */
export async function loginAsAdmin(page: Page) {
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
}

export async function loginAs(
  page: Page,
  email: string,
  password = DEFAULT_PASSWORD,
) {
  await page.context().clearCookies();
  await page.goto("/login", { waitUntil: "load" });

  await page
    .waitForResponse((r) => r.url().includes("/api/auth/csrf") && r.ok(), {
      timeout: 15000,
    })
    .catch(() => {});

  if (POST_LOGIN.test(page.url())) return;

  await page.getByLabel("이메일").fill(email);
  await page.getByLabel("비밀번호").fill(password);

  const loginButton = page.getByRole("button", { name: "로그인" });
  await expect(loginButton).toBeEnabled({ timeout: 10000 });

  try {
    await Promise.all([
      page.waitForURL(POST_LOGIN, { timeout: 60000 }),
      (async () => {
        const authDone = page.waitForResponse(
          (r) =>
            r.url().includes("/api/auth/callback/credentials") ||
            r.url().includes("/api/auth/session"),
          { timeout: 60000 },
        );
        await loginButton.click();
        await authDone;
        await page.waitForURL(POST_LOGIN, { timeout: 60000 }).catch(() => {});
      })(),
    ]);
  } catch {
    const hasError = await page
      .getByText("이메일 또는 비밀번호가 올바르지 않습니다")
      .isVisible()
      .catch(() => false);
    if (hasError) {
      throw new Error(`login failed for ${email} (invalid credentials)`);
    }
    throw new Error(`login failed for ${email} (landed=timeout)`);
  }

  if (page.url().includes("/settings/change-password")) {
    await completePasswordChangeIfNeeded(page);
    return;
  }

  if (POST_LOGIN.test(page.url())) return;

  throw new Error(`login failed for ${email} (landed=${page.url()})`);
}
