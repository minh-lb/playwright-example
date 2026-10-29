import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { loginAs } from "./helpers";

type BookingPayload = {
  serviceId: number;
  date: string;
  timeSlot: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string;
};

function dateAfter(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function uniqueToken() {
  return randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
}

function makeBookingPayload(serviceId: number, overrides: Partial<BookingPayload> = {}): BookingPayload {
  const token = uniqueToken();
  return {
    serviceId,
    date: dateAfter(7),
    timeSlot: "16:00",
    customerName: `E2E Guest ${token}`,
    customerEmail: `e2e-${token.toLowerCase()}@example.com`,
    customerPhone: "09099887766",
    notes: "",
    ...overrides,
  };
}

async function getServiceId(page: Page, name = "Personal consultation") {
  const response = await page.request.get("/api/services?active=true&limit=50");
  expect(response.status()).toBe(200);
  const result = await response.json() as { items: Array<{ id: number; name: string }> };
  const service = result.items.find((item) => item.name === name);
  if (!service) throw new Error(`Expected active service “${name}” in the test database`);
  return service.id;
}

async function openDateAndTimeStep(page: Page, serviceName = "Personal consultation") {
  await page.goto("/bookings/new");
  const service = page.getByRole("button", { name: serviceName, exact: true });
  await expect(service).toBeVisible();
  await service.click();
  await page.getByRole("button", { name: /continue/i }).click();
  await expect(page.getByRole("heading", { name: "Date & time", exact: true })).toBeVisible();
}

async function fillDateAndWaitForAvailability(page: Page, date: string) {
  const availabilityResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === "/api/availability" && response.request().method() === "GET";
  });
  await page.getByLabel("Booking date").fill(date);
  const response = await availabilityResponse;
  expect(response.status()).toBe(200);
}

async function openCustomerDetails(page: Page) {
  await openDateAndTimeStep(page, "Career coaching");
  await fillDateAndWaitForAvailability(page, dateAfter(7));
  await page.getByRole("button", { name: "15:00", exact: true }).click();
  await page.getByRole("button", { name: /continue/i }).click();
  await expect(page.getByRole("heading", { name: "Your details", exact: true })).toBeVisible();
}

async function expectBlockedOnStep(page: Page, stepTitle: string, expectedError: string | RegExp) {
  await page.getByRole("button", { name: /continue/i }).click();
  await expect(page.getByRole("alert")).toHaveText(expectedError);
  await expect(page.getByRole("heading", { name: stepTitle, exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Review & confirm", exact: true })).toHaveCount(0);
}

function countBookingCreateRequests(page: Page) {
  let count = 0;
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (request.method() === "POST" && url.pathname === "/api/bookings") count += 1;
  });
  return () => count;
}

async function getBookingCount(page: Page) {
  const response = await page.request.get("/api/bookings");
  expect(response.status()).toBe(200);
  const result = await response.json() as { total: number };
  return result.total;
}

test("creates a booking through all four steps and finds the persisted details", async ({ page }) => {
  await loginAs(page, "admin");
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "New booking" }).click();
  await expect(page.getByRole("heading", { name: "Choose a service", exact: true })).toBeVisible();

  const serviceName = "Personal consultation";
  const date = dateAfter(1);
  const timeSlot = "16:00";
  const token = uniqueToken();
  const customerName = `Playwright Guest ${token}`;
  const customerEmail = `playwright-${token.toLowerCase()}@example.com`;
  const customerPhone = "09099887766";

  await page.getByRole("button", { name: serviceName, exact: true }).click();
  await page.getByRole("button", { name: /continue/i }).click();
  await expect(page.getByRole("heading", { name: "Date & time", exact: true })).toBeVisible();
  await fillDateAndWaitForAvailability(page, date);
  await expect(page.getByRole("button", { name: timeSlot, exact: true })).toBeEnabled();
  await page.getByRole("button", { name: timeSlot, exact: true }).click();
  await page.getByRole("button", { name: /continue/i }).click();

  await expect(page.getByRole("heading", { name: "Your details", exact: true })).toBeVisible();
  await page.getByLabel("Full name").fill(customerName);
  await page.getByLabel("Email address").fill(customerEmail);
  await page.getByLabel("Phone number").fill(customerPhone);
  await page.getByRole("button", { name: /continue/i }).click();

  await expect(page.getByRole("heading", { name: "Review & confirm", exact: true })).toBeVisible();
  await expect(page.getByText(`${date} at ${timeSlot} · 60 minutes`, { exact: true })).toBeVisible();
  await expect(page.getByText(customerName, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(customerEmail, { exact: true })).toBeVisible();
  await expect(page.getByText(customerPhone, { exact: true })).toBeVisible();
  await expect(page.getByText(serviceName, { exact: true }).last()).toBeVisible();

  await page.getByRole("button", { name: /confirm booking/i }).click();
  await expect(page.getByRole("heading", { name: /booking confirmed/i })).toBeVisible();
  const bookingReference = page.getByText(/^BK-[A-F0-9]{8}$/);
  await expect(bookingReference).toBeVisible();
  const reference = await bookingReference.textContent();
  expect(reference).toMatch(/^BK-[A-F0-9]{8}$/);

  await page.getByRole("link", { name: /view all bookings/i }).click();
  await page.getByPlaceholder("Search bookings...").fill(customerName);
  const bookingRow = page.getByRole("row").filter({ hasText: customerName });
  await expect(bookingRow).toBeVisible();
  await expect(bookingRow).toContainText(reference!);
  await expect(bookingRow).toContainText(customerEmail);
  await expect(bookingRow).toContainText(serviceName);
  await expect(bookingRow).toContainText(date);
  await expect(bookingRow).toContainText(timeSlot);
  await expect(bookingRow).toContainText("confirmed");
});

test("requires a service before leaving the first step", async ({ page }) => {
  await loginAs(page, "staff");
  await page.goto("/bookings/new");
  await expect(page.getByRole("heading", { name: "Choose a service", exact: true })).toBeVisible();
  const bookingCreateRequests = countBookingCreateRequests(page);

  await expectBlockedOnStep(page, "Choose a service", "Select a service to continue");
  expect(bookingCreateRequests()).toBe(0);
});

test("requires a date and time before leaving the schedule step", async ({ page }) => {
  await loginAs(page, "staff");
  await openDateAndTimeStep(page);
  const bookingCreateRequests = countBookingCreateRequests(page);

  await expectBlockedOnStep(page, "Date & time", "Choose a future date and available time");
  expect(bookingCreateRequests()).toBe(0);
});

test("requires a time slot after a valid date is selected", async ({ page }) => {
  await loginAs(page, "staff");
  await openDateAndTimeStep(page);
  await fillDateAndWaitForAvailability(page, dateAfter(7));
  const bookingCreateRequests = countBookingCreateRequests(page);

  await expectBlockedOnStep(page, "Date & time", "Choose a future date and available time");
  expect(bookingCreateRequests()).toBe(0);
});

test("rejects a past date even when a time slot is selected", async ({ page }) => {
  await loginAs(page, "staff");
  await openDateAndTimeStep(page);
  await fillDateAndWaitForAvailability(page, dateAfter(-1));
  await page.getByRole("button", { name: "16:00", exact: true }).click();
  const bookingCreateRequests = countBookingCreateRequests(page);

  await expectBlockedOnStep(page, "Date & time", "Choose a future date and available time");
  expect(bookingCreateRequests()).toBe(0);
});

const invalidCustomerCases: Array<{
  name: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string;
  expectedError: string | RegExp;
}> = [
  { name: "a missing name", customerName: "", customerEmail: "guest@example.com", customerPhone: "09099887766", notes: "", expectedError: "Enter a customer name" },
  { name: "a whitespace-only name", customerName: "   ", customerEmail: "guest@example.com", customerPhone: "09099887766", notes: "", expectedError: "Enter a customer name" },
  { name: "a one-character name", customerName: "A", customerEmail: "guest@example.com", customerPhone: "09099887766", notes: "", expectedError: "Enter a customer name" },
  { name: "a name over 100 characters", customerName: "A".repeat(101), customerEmail: "guest@example.com", customerPhone: "09099887766", notes: "", expectedError: /100 characters/i },
  { name: "an invalid email address", customerName: "Valid Guest", customerEmail: "not-an-email", customerPhone: "09099887766", notes: "", expectedError: "Enter a valid email" },
  { name: "a missing phone number", customerName: "Valid Guest", customerEmail: "guest@example.com", customerPhone: "", notes: "", expectedError: "Enter a phone number" },
  { name: "a phone number under 8 characters", customerName: "Valid Guest", customerEmail: "guest@example.com", customerPhone: "1234567", notes: "", expectedError: "Enter a phone number" },
  { name: "a phone number over 20 characters", customerName: "Valid Guest", customerEmail: "guest@example.com", customerPhone: "1".repeat(21), notes: "", expectedError: /20 characters/i },
  { name: "notes over 500 characters", customerName: "Valid Guest", customerEmail: "guest@example.com", customerPhone: "09099887766", notes: "N".repeat(501), expectedError: /500 characters/i },
];

for (const scenario of invalidCustomerCases) {
  test(`blocks ${scenario.name} without advancing or creating a booking`, async ({ page }) => {
    await loginAs(page, "staff");
    await openCustomerDetails(page);
    const bookingCreateRequests = countBookingCreateRequests(page);

    await page.getByLabel("Full name").fill(scenario.customerName);
    await page.getByLabel("Email address").fill(scenario.customerEmail);
    await page.getByLabel("Phone number").fill(scenario.customerPhone);
    await page.getByLabel("Notes (optional)").fill(scenario.notes);
    await expectBlockedOnStep(page, "Your details", scenario.expectedError);

    expect(bookingCreateRequests()).toBe(0);
  });
}

test("does not create a booking through the API without an authenticated session", async ({ page }) => {
  const response = await page.request.post("/api/bookings", { data: {} });
  expect(response.status()).toBe(401);
  await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
});

const invalidApiBookingCases: Array<{
  name: string;
  makeInvalid: (payload: BookingPayload) => BookingPayload;
  expectedError: RegExp;
}> = [
  { name: "a non-positive service ID", makeInvalid: (payload) => ({ ...payload, serviceId: 0 }), expectedError: /select a service/i },
  { name: "a malformed date", makeInvalid: (payload) => ({ ...payload, date: "not-a-date" }), expectedError: /choose a valid date/i },
  { name: "a past date", makeInvalid: (payload) => ({ ...payload, date: dateAfter(-1) }), expectedError: /choose today or a future date/i },
  { name: "an unsupported time slot", makeInvalid: (payload) => ({ ...payload, timeSlot: "12:00" }), expectedError: /choose an available time/i },
  { name: "a blank customer name", makeInvalid: (payload) => ({ ...payload, customerName: "   " }), expectedError: /enter a customer name/i },
  { name: "a customer name over 100 characters", makeInvalid: (payload) => ({ ...payload, customerName: "N".repeat(101) }), expectedError: /100 characters/i },
  { name: "an invalid email address", makeInvalid: (payload) => ({ ...payload, customerEmail: "not-an-email" }), expectedError: /valid email/i },
  { name: "a phone number under 8 characters", makeInvalid: (payload) => ({ ...payload, customerPhone: "1234567" }), expectedError: /enter a phone number/i },
  { name: "a phone number over 20 characters", makeInvalid: (payload) => ({ ...payload, customerPhone: "1".repeat(21) }), expectedError: /20 characters/i },
  { name: "notes over 500 characters", makeInvalid: (payload) => ({ ...payload, notes: "N".repeat(501) }), expectedError: /500 characters/i },
];

test.describe("booking API validation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "staff");
  });

  for (const scenario of invalidApiBookingCases) {
    test(`rejects ${scenario.name} without persisting a booking`, async ({ page }) => {
      const serviceId = await getServiceId(page);
      const invalidPayload = scenario.makeInvalid(makeBookingPayload(serviceId));
      const countBefore = await getBookingCount(page);

      const response = await page.request.post("/api/bookings", { data: invalidPayload });
      expect(response.status()).toBe(400);
      const result = await response.json() as { error: string };
      expect(result.error).toMatch(scenario.expectedError);
      expect(await getBookingCount(page)).toBe(countBefore);
    });
  }
});

test("rejects booking attempts for archived services", async ({ page }) => {
  await loginAs(page, "admin");
  const token = uniqueToken();
  const serviceResponse = await page.request.post("/api/services", {
    data: {
      name: `Archived service ${token}`,
      description: "Temporary service for booking API validation.",
      category: "Coaching",
      durationMinutes: 60,
      price: 250000,
      color: "indigo",
      active: true,
    },
  });
  expect(serviceResponse.status()).toBe(201);
  const service = await serviceResponse.json() as { id: number };

  const archiveResponse = await page.request.delete(`/api/services/${service.id}`);
  expect(archiveResponse.status()).toBe(200);

  const payload = makeBookingPayload(service.id);
  const countBefore = await getBookingCount(page);
  const bookingResponse = await page.request.post("/api/bookings", { data: payload });
  expect(bookingResponse.status()).toBe(400);
  await expect(bookingResponse.json()).resolves.toEqual({ error: "The selected service is unavailable." });
  expect(await getBookingCount(page)).toBe(countBefore);

  const servicesResponse = await page.request.get(`/api/services?search=${encodeURIComponent(token)}&limit=50`);
  expect(servicesResponse.status()).toBe(200);
  const servicesResult = await servicesResponse.json() as { items: Array<{ active: boolean }> };
  expect(servicesResult.items).toHaveLength(1);
  expect(servicesResult.items[0].active).toBe(false);
});

test("accepts inclusive customer field length limits", async ({ page }) => {
  await loginAs(page, "staff");
  const serviceId = await getServiceId(page);
  const boundaryCases = [
    {
      name: "minimum lengths",
      timeSlot: "15:00",
      customerName: "Jo",
      customerPhone: "12345678",
      notes: "",
    },
    {
      name: "maximum lengths",
      timeSlot: "17:00",
      customerName: "N".repeat(100),
      customerPhone: "1".repeat(20),
      notes: "N".repeat(500),
    },
  ];

  for (const boundaryCase of boundaryCases) {
    const payload = makeBookingPayload(serviceId, {
      timeSlot: boundaryCase.timeSlot,
      customerName: boundaryCase.customerName,
      customerPhone: boundaryCase.customerPhone,
      notes: boundaryCase.notes,
    });
    const response = await page.request.post("/api/bookings", { data: payload });
    expect(response.status(), boundaryCase.name).toBe(201);
    const booking = await response.json() as {
      customer: { name: string; email: string; phone: string };
      notes: string;
      timeSlot: string;
    };
    expect(booking.customer).toMatchObject({
      name: payload.customerName,
      email: payload.customerEmail,
      phone: payload.customerPhone,
    });
    expect(booking.notes).toBe(payload.notes);
    expect(booking.timeSlot).toBe(payload.timeSlot);
  }
});

test("marks an occupied slot unavailable and rejects a duplicate booking", async ({ page }) => {
  await loginAs(page, "staff");
  const serviceId = await getServiceId(page);
  const payload = makeBookingPayload(serviceId);

  const createResponse = await page.request.post("/api/bookings", { data: payload });
  expect(createResponse.status()).toBe(201);
  const created = await createResponse.json() as {
    reference: string;
    status: string;
    date: string;
    timeSlot: string;
    customer: { name: string; email: string; phone: string };
    service: { id: number; name: string };
  };
  expect(created.reference).toMatch(/^BK-[A-F0-9]{8}$/);
  expect(created.status).toBe("CONFIRMED");
  expect(created.date).toBe(payload.date);
  expect(created.timeSlot).toBe(payload.timeSlot);
  expect(created.customer).toMatchObject({ name: payload.customerName, email: payload.customerEmail, phone: payload.customerPhone });
  expect(created.service).toMatchObject({ id: serviceId, name: "Personal consultation" });

  await openDateAndTimeStep(page);
  await fillDateAndWaitForAvailability(page, payload.date);
  await expect(page.getByRole("button", { name: payload.timeSlot, exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "15:00", exact: true })).toBeEnabled();

  const duplicateResponse = await page.request.post("/api/bookings", { data: payload });
  expect(duplicateResponse.status()).toBe(409);
  await expect(duplicateResponse.json()).resolves.toEqual({ error: "This time is already booked. Choose another slot." });

  const searchResponse = await page.request.get(`/api/bookings?search=${encodeURIComponent(payload.customerName)}`);
  expect(searchResponse.status()).toBe(200);
  const searchResult = await searchResponse.json() as { total: number; items: Array<{ reference: string; customer: { email: string } }> };
  expect(searchResult.total).toBe(1);
  expect(searchResult.items).toHaveLength(1);
  expect(searchResult.items[0]).toMatchObject({ reference: created.reference, customer: { email: payload.customerEmail } });
});

test("admin can create and archive a service", async ({ page }) => {
  await loginAs(page, "admin");
  await page.goto("/services");
  await page.getByRole("button", { name: /add service/i }).click();
  await page.getByLabel("Service name").fill("Playwright Workshop");
  await page.getByLabel("Description").fill("Automated testing workshop for teams");
  await page.getByLabel("Category", { exact: true }).selectOption("Coaching");
  await page.getByLabel("Duration").selectOption("60");
  await page.getByLabel("Price (VND)").fill("250000");
  await page.getByRole("button", { name: /save service/i }).click();
  await page.getByPlaceholder("Search services...").fill("Playwright Workshop");
  await expect(page.getByText("Playwright Workshop")).toBeVisible();
  await page.getByRole("button", { name: /archive playwright workshop/i }).click();
  await page.getByRole("button", { name: /confirm archive/i }).click();
  await expect(page.getByText(/archived/i).first()).toBeVisible();
});
