import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers";

test("create a booking using all four wizard steps and find it", async ({ page }) => {
  await loginAs(page, "admin");
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "New booking" }).click();
  await page.getByRole("button", { name: /personal consultation/i }).click();
  await page.getByRole("button", { name: /continue/i }).click();

  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  await page.getByLabel("Booking date").fill(tomorrow);
  await page.getByRole("button", { name: "16:00" }).click();
  await page.getByRole("button", { name: /continue/i }).click();

  await page.getByLabel("Full name").fill("Playwright Guest");
  await page.getByLabel("Email address").fill("playwright@example.com");
  await page.getByLabel("Phone number").fill("0909988776");
  await page.getByRole("button", { name: /continue/i }).click();

  await expect(page.getByText("Playwright Guest").first()).toBeVisible();
  await page.getByRole("button", { name: /confirm booking/i }).click();
  await expect(page.getByRole("heading", { name: /booking confirmed/i })).toBeVisible();
  await page.getByRole("link", { name: /view all bookings/i }).click();
  await page.getByPlaceholder("Search bookings...").fill("Playwright Guest");
  await expect(page.getByText("Playwright Guest")).toBeVisible();
});

test("required customer fields block the wizard", async ({ page }) => {
  await loginAs(page, "staff");
  await page.goto("/bookings/new");
  await page.getByRole("button", { name: /career coaching/i }).click();
  await page.getByRole("button", { name: /continue/i }).click();
  const tomorrow = new Date(Date.now() + 172_800_000).toISOString().slice(0, 10);
  await page.getByLabel("Booking date").fill(tomorrow);
  await page.getByRole("button", { name: "15:00" }).click();
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByRole("button", { name: /continue/i }).click();
  await expect(page.getByText(/enter a customer name/i)).toBeVisible();
});

test("admin can create and archive a service", async ({ page }) => {
  await loginAs(page, "admin");
  await page.goto("/services");
  await page.getByRole("button", { name: /add service/i }).click();
  await page.getByLabel("Service name").fill("Playwright Workshop");
  await page.getByLabel("Description").fill("Automated testing workshop for teams");
  await page.getByLabel("Category").selectOption("Coaching");
  await page.getByLabel("Duration").selectOption("60");
  await page.getByLabel("Price (VND)").fill("250000");
  await page.getByRole("button", { name: /save service/i }).click();
  await page.getByPlaceholder("Search services...").fill("Playwright Workshop");
  await expect(page.getByText("Playwright Workshop")).toBeVisible();
  await page.getByRole("button", { name: /archive playwright workshop/i }).click();
  await page.getByRole("button", { name: /confirm archive/i }).click();
  await expect(page.getByText(/archived/i).first()).toBeVisible();
});
