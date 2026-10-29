import { expect, type Page } from "@playwright/test";

export async function loginAs(page: Page, role: "admin" | "staff") {
  await page.goto("/login");
  await page.getByRole("button", { name: /continue with keycloak/i }).click();
  await page.locator("#username").fill(role);
  await page.locator("#password").fill(role === "admin" ? "Admin123!" : "Staff123!");
  await page.locator("#kc-login").click();
  await expect(page).toHaveURL(/\/dashboard/);
}
