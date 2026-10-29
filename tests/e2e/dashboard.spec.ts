import { expect, test, type Page } from "@playwright/test";
import { loginAs } from "./helpers";

const DASHBOARD_BOOKING_PAGE_SIZE = 8;
const DASHBOARD_RECENT_BOOKING_COUNT = 5;

type DashboardBooking = {
  reference: string;
  status: string;
  date: string;
  customer: { email: string };
  service: { price: number };
};

type BookingList = {
  items: DashboardBooking[];
  total: number;
  pageSize: number;
};

async function expectDashboardStat(page: Page, label: string, value: number) {
  const formattedValue = String(value).padStart(2, "0");
  const card = page.getByText(label, { exact: true }).locator("..");
  await expect(card).toContainText(formattedValue);
}

test("dashboard totals, completed revenue, and recent bookings match persisted data", async ({ page }) => {
  await loginAs(page, "admin");
  const [bookingsResponse, servicesResponse] = await Promise.all([
    page.request.get("/api/bookings?page=1&sort=newest"),
    page.request.get("/api/services?active=true&limit=50"),
  ]);
  expect(bookingsResponse.status()).toBe(200);
  expect(servicesResponse.status()).toBe(200);
  const bookings = await bookingsResponse.json() as BookingList;
  const services = await servicesResponse.json() as { total: number };
  expect(bookings.pageSize).toBe(DASHBOARD_BOOKING_PAGE_SIZE);
  expect(bookings.items).toHaveLength(DASHBOARD_BOOKING_PAGE_SIZE);
  const allBookings = [...bookings.items];
  for (let pageNumber = 2; pageNumber <= Math.ceil(bookings.total / bookings.pageSize); pageNumber += 1) {
    const response = await page.request.get(`/api/bookings?page=${pageNumber}&sort=newest`);
    expect(response.status()).toBe(200);
    allBookings.push(...(await response.json() as BookingList).items);
  }
  expect(allBookings).toHaveLength(bookings.total);

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /Good to see you/ })).toBeVisible();
  await expectDashboardStat(page, "Total bookings", bookings.total);
  await expectDashboardStat(page, "Active services", services.total);
  const uniqueCustomers = new Set(allBookings.map((booking) => booking.customer.email)).size;
  await expectDashboardStat(page, "Customers", uniqueCustomers);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = allBookings.filter((booking) => booking.status === "CONFIRMED" && booking.date >= today).length;
  await expectDashboardStat(page, "Upcoming", upcoming);

  const recentReferences = await page
    .locator('tbody tr td:first-child div[class~="mt-0.5"]')
    .allTextContents();
  expect(recentReferences).toEqual(
    bookings.items
      .slice(0, DASHBOARD_RECENT_BOOKING_COUNT)
      .map((booking) => booking.reference),
  );
  const expectedRevenue = allBookings
    .filter((booking) => booking.status === "COMPLETED")
    .reduce((sum, booking) => sum + booking.service.price, 0);
  const formattedRevenue = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(expectedRevenue);
  await expect(
    page.getByText("Business snapshot", { exact: true }).locator("..").getByText(formattedRevenue, { exact: true }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Explore bookings" }).click();
  await expect(page).toHaveURL(/\/bookings$/);
  await expect(page.getByRole("heading", { name: "Bookings", exact: true })).toBeVisible();
});

test("staff dashboard omits the admin-only services navigation", async ({ page }) => {
  await loginAs(page, "staff");
  await page.goto("/dashboard");
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await expect(navigation.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Bookings" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Services" })).toHaveCount(0);
});
