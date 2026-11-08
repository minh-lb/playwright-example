import { expect, test, type Page } from "@playwright/test";
import { getToast, loginAs } from "./helpers";
import {
  createBooking,
  type CreatedBooking,
  dateAfter,
  getServiceId,
  INVALID_FUTURE_CALENDAR_DATE,
  makeBookingPayload,
  uniqueToken,
} from "./test-data";

const BOOKING_PAGE_SIZE = 8;
const BOOKING_STATUSES = ["CONFIRMED", "COMPLETED", "CANCELED"] as const;
const NEWEST_BOOKING_SORT = "newest";
const OLDEST_BOOKING_SORT = "oldest";
const TEST_BOOKING_DATE_OFFSETS = {
  search: 200,
  cancellation: 201,
  completion: 202,
  apiValidation: 203,
} as const;

type BookingList = {
  items: Array<{
    id: number;
    reference: string;
    createdAt: string;
    status: string;
    customer: { name: string };
  }>;
  total: number;
  page: number;
  pageSize: number;
};

async function findBooking(page: Page, search: string) {
  const response = await page.request.get(`/api/bookings?search=${encodeURIComponent(search)}&limit=50`);
  expect(response.status()).toBe(200);
  return await response.json() as BookingList;
}

test.describe("booking management", () => {
  test("searches bookings, filters every status, and shows complete booking details", async ({ page }) => {
    await loginAs(page, "staff");
    const serviceId = await getServiceId(page, "Career coaching");
    const token = uniqueToken();
    const payload = makeBookingPayload(serviceId, {
      customerName: `Manage Guest ${token}`,
      customerEmail: `manage-${token.toLowerCase()}@example.com`,
      customerPhone: "09112223334",
      notes: "Bring the project outline",
      date: dateAfter(TEST_BOOKING_DATE_OFFSETS.search),
    });
    const created = await createBooking(page, payload);

    await page.goto("/bookings");
    const search = page.getByPlaceholder("Search bookings...");
    const rows = page.locator("tbody tr");
    await search.fill(payload.customerName);
    const row = page.locator("tbody tr").filter({ hasText: payload.customerName });
    await expect(row).toHaveCount(1);
    for (const value of [
      created.reference,
      "Career coaching",
      payload.date,
      payload.timeSlot,
      "confirmed",
    ]) {
      await expect(row).toContainText(value);
    }

    await page.getByLabel("Filter by status").selectOption("COMPLETED");
    await expect(page.getByRole("heading", { name: "No bookings found" })).toBeVisible();
    await page.getByLabel("Filter by status").selectOption("CANCELED");
    await expect(page.getByRole("heading", { name: "No bookings found" })).toBeVisible();
    await page.getByLabel("Filter by status").selectOption("CONFIRMED");
    await expect(row).toBeVisible();

    await row.getByRole("button", { name: `View ${created.reference}` }).click();
    const dialog = page.getByRole("dialog", { name: `Booking ${created.reference}` });
    await expect(dialog).toContainText(payload.customerName);
    await expect(dialog).toContainText(payload.customerEmail);
    await expect(dialog).toContainText(payload.customerPhone);
    await expect(dialog).toContainText("Bring the project outline");
    await expect(dialog).toContainText("Career coaching");
    await expect(dialog).toContainText(payload.date);
    await expect(dialog).toContainText(payload.timeSlot);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);

    await search.fill("");
    for (const status of BOOKING_STATUSES) {
      const statusResponse = await page.request.get(`/api/bookings?status=${status}`);
      expect(statusResponse.status()).toBe(200);
      const statusBookings = await statusResponse.json() as BookingList;
      expect(statusBookings.total).toBeGreaterThan(0);
      await page.getByLabel("Filter by status").selectOption(status);
      await expect(rows).toHaveCount(Math.min(statusBookings.total, BOOKING_PAGE_SIZE));
      for (const rowForStatus of await rows.all()) {
        await expect(rowForStatus).toContainText(status.toLowerCase());
      }
    }

    await search.fill(`no-such-booking-${token}`);
    await expect(page.getByRole("heading", { name: "No bookings found" })).toBeVisible();
    await expect(page.getByText("Showing 0–0 of 0")).toBeVisible();

    await page.getByLabel("Filter by status").selectOption("All");
    await search.fill(created.reference);
    await expect(rows).toHaveCount(1);
    await expect(rows).toContainText(created.reference);

    await search.fill("Career coaching");
    const serviceSearchQuery = new URLSearchParams({ search: "Career coaching" });
    const serviceSearch = await page.request.get(
      "/api/bookings?" + serviceSearchQuery.toString(),
    );
    expect(serviceSearch.status()).toBe(200);
    const matchingBookings = await serviceSearch.json() as BookingList;
    await expect(rows).toHaveCount(Math.min(matchingBookings.total, BOOKING_PAGE_SIZE));
  });

  test("requires explicit cancellation confirmation and releases the slot for rebooking", async ({ page }) => {
    await loginAs(page, "staff");
    const serviceId = await getServiceId(page);
    const payload = makeBookingPayload(serviceId, {
      date: dateAfter(TEST_BOOKING_DATE_OFFSETS.cancellation),
      notes: "Cancel flow note",
    });
    const booking = await createBooking(page, payload);

    await page.goto("/bookings");
    await page.getByPlaceholder("Search bookings...").fill(payload.customerName);
    const row = page.locator("tbody tr").filter({ hasText: booking.reference });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: `View ${booking.reference}` }).click();
    await page.getByRole("button", { name: "Cancel booking" }).click();
    const confirmation = page.getByRole("dialog", { name: "Cancel booking" });
    await expect(confirmation).toContainText("The time slot will become available again");
    await page.getByRole("button", { name: "Go back" }).click();
    await expect(page.getByRole("dialog", { name: `Booking ${booking.reference}` })).toBeVisible();
    expect((await findBooking(page, payload.customerName)).items[0].status).toBe("CONFIRMED");

    await page.getByRole("button", { name: "Cancel booking" }).click();
    await page.getByRole("button", { name: "Confirm cancellation" }).click();
    await expect(getToast(page, "Booking canceled")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(row).toContainText("canceled");
    expect((await findBooking(page, payload.customerName)).items[0].status).toBe("CANCELED");

    const availability = await page.request.get(`/api/availability?serviceId=${serviceId}&date=${payload.date}`);
    expect(availability.status()).toBe(200);
    expect((await availability.json() as { booked: string[] }).booked).not.toContain(payload.timeSlot);

    const replacement = await createBooking(page, {
      ...payload,
      customerName: `Replacement ${uniqueToken()}`,
      customerEmail: `replacement-${uniqueToken().toLowerCase()}@example.com`,
    });
    expect(replacement.status).toBe("CONFIRMED");
    expect(replacement.timeSlot).toBe(payload.timeSlot);
    const occupiedAgain = await page.request.get(`/api/availability?serviceId=${serviceId}&date=${payload.date}`);
    expect((await occupiedAgain.json() as { booked: string[] }).booked).toContain(payload.timeSlot);
  });

  test("completes a booking and prevents terminal status changes", async ({ page }) => {
    await loginAs(page, "admin");
    const serviceId = await getServiceId(page);
    const payload = makeBookingPayload(serviceId, {
      date: dateAfter(TEST_BOOKING_DATE_OFFSETS.completion),
    });
    const booking = await createBooking(page, payload);

    await page.goto("/bookings");
    await page.getByPlaceholder("Search bookings...").fill(payload.customerName);
    const row = page.locator("tbody tr").filter({ hasText: booking.reference });
    await row.getByRole("button", { name: `View ${booking.reference}` }).click();
    await page.getByRole("button", { name: "Mark completed" }).click();
    await expect(page.getByRole("dialog", { name: "Complete booking" })).toBeVisible();
    await page.getByRole("button", { name: "Confirm completion" }).click();
    await expect(getToast(page, "Booking marked completed")).toBeVisible();
    await expect(row).toContainText("completed");

    const current = await findBooking(page, payload.customerName);
    expect(current.items).toHaveLength(1);
    expect(current.items[0].status).toBe("COMPLETED");
    const availability = await page.request.get(`/api/availability?serviceId=${serviceId}&date=${payload.date}`);
    expect((await availability.json() as { booked: string[] }).booked).toContain(payload.timeSlot);
    const invalidTransition = await page.request.patch(`/api/bookings/${booking.id}`, { data: { status: "CANCELED" } });
    expect(invalidTransition.status()).toBe(409);
    expect(await invalidTransition.json()).toEqual({ error: "This booking can no longer change status" });
    const idempotentTransition = await page.request.patch(
      `/api/bookings/${booking.id}`,
      { data: { status: "COMPLETED" } },
    );
    expect(idempotentTransition.status()).toBe(200);

    await row.getByRole("button", { name: `View ${booking.reference}` }).click();
    const detail = page.getByRole("dialog", { name: `Booking ${booking.reference}` });
    await expect(detail.getByRole("button", { name: "Cancel booking" })).toHaveCount(0);
    await expect(detail.getByRole("button", { name: "Mark completed" })).toHaveCount(0);
  });

  test("sorts by creation time, paginates without duplicates, and resets paging after search", async ({ page }) => {
    await loginAs(page, "staff");
    const serviceId = await getServiceId(page);
    const created: CreatedBooking[] = [];
    for (let index = 0; index < 9; index += 1) {
      const payload = makeBookingPayload(serviceId, {
        date: dateAfter(100 + index),
        customerName: `Page Guest ${index} ${uniqueToken()}`,
      });
      created.push(await createBooking(page, payload));
    }

    const newestResponse = await page.request.get(
      "/api/bookings?page=1&sort=" + NEWEST_BOOKING_SORT,
    );
    expect(newestResponse.status()).toBe(200);
    const newest = await newestResponse.json() as BookingList;
    const oldestResponse = await page.request.get(
      "/api/bookings?page=1&sort=" + OLDEST_BOOKING_SORT,
    );
    expect(oldestResponse.status()).toBe(200);
    const oldest = await oldestResponse.json() as BookingList;
    expect(newest.pageSize).toBe(BOOKING_PAGE_SIZE);
    expect(newest.total).toBeGreaterThanOrEqual(17);
    expect(newest.items).toHaveLength(BOOKING_PAGE_SIZE);
    expect(oldest.items).toHaveLength(BOOKING_PAGE_SIZE);
    for (const list of [newest, oldest]) {
      const timestamps = list.items.map((item) => Date.parse(item.createdAt));
      const direction = list === newest ? 1 : -1;
      for (let index = 1; index < timestamps.length; index += 1) {
        expect((timestamps[index - 1] - timestamps[index]) * direction).toBeGreaterThanOrEqual(0);
      if (timestamps[index - 1] === timestamps[index]) {
        expect((list.items[index - 1].id - list.items[index].id) * direction)
          .toBeGreaterThanOrEqual(0);
      }
      }
    }

    await page.goto("/bookings");
    const getVisibleReferences = () =>
      page.locator("tbody tr td:first-child").allTextContents();
    await expect(page.locator("tbody tr")).toHaveCount(BOOKING_PAGE_SIZE);
    const firstPageReferences = (await getVisibleReferences()).map((reference) =>
      reference.trim(),
    );
    expect(firstPageReferences).toEqual(newest.items.map((item) => item.reference));
    await page.getByRole("button", { name: "Next", exact: true }).click();
    const secondPageLabel = "Showing 9–16 of " + newest.total;
    await expect(page.getByText(secondPageLabel)).toBeVisible();
    const secondPageResponse = await page.request.get(
      "/api/bookings?page=2&sort=" + NEWEST_BOOKING_SORT,
    );
    const secondPage = await secondPageResponse.json() as BookingList;
    expect(secondPage.items).toHaveLength(BOOKING_PAGE_SIZE);
    await expect(page.locator("tbody tr td:first-child").first()).toHaveText(
      secondPage.items[0].reference,
    );
    const secondPageReferences = (await getVisibleReferences()).map((reference) =>
      reference.trim(),
    );
    expect(secondPageReferences).toEqual(secondPage.items.map((item) => item.reference));
    await expect(page.getByText(`Showing 9–16 of ${newest.total}`)).toBeVisible();
    const firstPageRefs = new Set(newest.items.map((item) => item.reference));
    expect(secondPage.items.some((item) => firstPageRefs.has(item.reference))).toBe(false);

    await page.getByRole("button", { name: "Previous", exact: true }).click();
    const oldestListResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === "/api/bookings"
        && url.searchParams.get("sort") === OLDEST_BOOKING_SORT
        && response.request().method() === "GET";
    });
    await page.getByLabel("Sort bookings").selectOption(OLDEST_BOOKING_SORT);
    await oldestListResponse;
    await expect(page.locator("tbody tr td:first-child").first()).toHaveText(
      oldest.items[0].reference,
    );
    const oldestVisible = await page.locator("tbody tr td:first-child").allTextContents();
    expect(oldestVisible.map((reference) => reference.trim())).toEqual(oldest.items.map((item) => item.reference));

    const searchName = created[0].customer.name;
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByText(new RegExp(`Showing 9–16 of ${newest.total}`))).toBeVisible();
    await page.getByPlaceholder("Search bookings...").fill(searchName);
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.getByText("Showing 1–1 of 1")).toBeVisible();
    await expect(page.locator("tbody tr")).toContainText(searchName);
    await expect(page.getByRole("button", { name: "Previous", exact: true })).toBeDisabled();
  });

  test("validates status updates and malformed or missing booking IDs", async ({ page }) => {
    await loginAs(page, "admin");
    const serviceId = await getServiceId(page);
    const booking = await createBooking(page, makeBookingPayload(serviceId, {
      date: dateAfter(TEST_BOOKING_DATE_OFFSETS.apiValidation),
    }));
    const invalid = await page.request.patch(`/api/bookings/${booking.id}`, { data: { status: "PENDING" } });
    expect(invalid.status()).toBe(400);
    expect(await invalid.json()).toEqual({ error: "Invalid status" });
    expect((await page.request.patch("/api/bookings/not-an-id", { data: { status: "COMPLETED" } })).status()).toBe(400);
    expect((await page.request.patch("/api/bookings/999999", { data: { status: "COMPLETED" } })).status()).toBe(404);
    expect((await page.request.get(`/api/availability?serviceId=${serviceId}&date=invalid`)).status()).toBe(400);
    expect((await page.request.get("/api/availability?serviceId=0&date=2027-01-01")).status()).toBe(400);
    const invalidCalendarDate = await page.request.get(
      `/api/availability?serviceId=${serviceId}&date=${INVALID_FUTURE_CALENDAR_DATE}`,
    );
    expect(invalidCalendarDate.status()).toBe(400);
  });

  test("shows an actionable error when the booking list request fails", async ({ page }) => {
    await loginAs(page, "staff");
    await page.route("**/api/bookings?*", (route) => route.abort("failed"));
    await page.goto("/bookings");
    await expect(page.getByRole("heading", { name: "Could not load bookings" })).toBeVisible();
  });
});
