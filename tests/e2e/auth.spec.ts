import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers";

test("unauthenticated visitors see the sign-in screen", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("button", { name: /continue with keycloak/i })).toBeVisible();
});

test("admin signs in through Keycloak and can open services", async ({ page }) => {
  await loginAs(page, "admin");
  await page.getByRole("link", { name: "Services" }).click();
  await expect(page.getByRole("heading", { name: "Services" })).toBeVisible();
  await expect(page.getByRole("button", { name: /add service/i })).toBeVisible();
});

test("staff cannot mutate services through the API", async ({ page }) => {
  await loginAs(page, "staff");
  const result = await page.request.post("/api/services", {
    data: { name: "Forbidden", description: "Forbidden service", category: "Wellness", durationMinutes: 60, price: 200000, color: "rose", active: true },
  });
  expect(result.status()).toBe(403);
  await expect(page.getByRole("link", { name: "Services" })).toHaveCount(0);
});

test("logout clears the application session", async ({ page }) => {
  await loginAs(page, "staff");
  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/bookings");
  await expect(page).toHaveURL(/\/login/);
});
