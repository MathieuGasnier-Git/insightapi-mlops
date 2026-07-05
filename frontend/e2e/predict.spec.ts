import { test, expect } from "@playwright/test";

// Full flow: log in, submit a prediction, see the result. Google's real
// consent screen can't be scripted in CI, so login goes through the
// E2E_TESTING-only credentials provider wired behind the same "Log in with
// Google" button (see components/LoginButton.tsx and
// app/api/auth/[...nextauth]/route.ts) — everything downstream (NextAuth
// session, the /api/token exchange, backend-main's JWT-gated proxy) is real.
test("user logs in, submits a prediction, and sees the result", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: /log in with google/i }).click();
  await expect(page.getByRole("button", { name: /log out/i })).toBeVisible();

  await page.getByRole("link", { name: /try sentiment prediction/i }).click();
  await expect(page).toHaveURL(/\/predict$/);

  await page.getByPlaceholder(/enter some text to analyze/i).fill("This movie was absolutely fantastic!");
  await page.getByRole("button", { name: /submit/i }).click();

  const result = page.getByTestId("predict-result");
  await expect(result).toBeVisible();
  await expect(result).toContainText(/positive/i);
  await expect(result).toContainText(/confidence/i);
});
