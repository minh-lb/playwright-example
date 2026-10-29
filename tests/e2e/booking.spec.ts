import { expect, test, type Page } from "@playwright/test";
import { getAppAlert, loginAs } from "./helpers";
import {
  dateAfter,
  getServiceId,
  INVALID_FUTURE_CALENDAR_DATE,
  makeBookingPayload,
  uniqueToken,
  type BookingPayload,
} from "./test-data";

const AVAILABILITY_FAILURE_MESSAGE =
  "Could not load available times. Please try again.";
const DUPLICATE_BOOKING_DATE_OFFSET = 45;

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
  await expect(getAppAlert(page)).toHaveText(expectedError);
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
  await expect(page.getByText(`${customerEmail} · ${customerPhone}`, { exact: true })).toBeVisible();
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

test("explains when no active services are available for booking", async ({ page }) => {
  await loginAs(page, "staff");
  await page.route("**/api/services?*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], total: 0, page: 1, pageSize: 50 }),
    }),
  );
  await page.goto("/bookings/new");

  await expect(page.getByRole("heading", { name: "No active services" })).toBeVisible();
  await expect(page.getByText("Ask an admin to add a service first.")).toBeVisible();
  const createRequests = countBookingCreateRequests(page);
  await expectBlockedOnStep(page, "Choose a service", "Select a service to continue");
  expect(createRequests()).toBe(0);
});

test("shows an error when available services fail to load", async ({ page }) => {
  await loginAs(page, "staff");
  await page.route("**/api/services?*", (route) => route.abort("failed"));
  await page.goto("/bookings/new");

  await expect(getAppAlert(page)).toHaveText(
    "Could not load services. Please refresh the page.",
  );
  await expect(page.getByRole("heading", { name: "No active services" })).toBeVisible();
});

test("blocks choosing a slot when availability cannot be loaded", async ({ page }) => {
  await loginAs(page, "staff");
  await page.route("**/api/availability?*", (route) => route.abort("failed"));
  await openDateAndTimeStep(page);
  await page.getByLabel("Booking date").fill(dateAfter(7));

  await expect(getAppAlert(page)).toHaveText(AVAILABILITY_FAILURE_MESSAGE);
  await expect(page.getByRole("button", { name: "16:00", exact: true })).toBeDisabled();

  const bookingCreateRequests = countBookingCreateRequests(page);
  await page.getByRole("button", { name: /continue/i }).click();
  await expect(getAppAlert(page)).toHaveText(AVAILABILITY_FAILURE_MESSAGE);
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

type InvalidCustomerCase = {
  name: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string;
  expectedError: string | RegExp;
};

const validCustomerFields = {
  customerName: "Valid Guest",
  customerEmail: "guest@example.com",
  customerPhone: "09099887766",
  notes: "",
};

const invalidCustomerCases: InvalidCustomerCase[] = [
  {
    name: "a missing name",
    ...validCustomerFields,
    customerName: "",
    expectedError: "Enter a customer name",
  },
  {
    name: "a whitespace-only name",
    ...validCustomerFields,
    customerName: "   ",
    expectedError: "Enter a customer name",
  },
  {
    name: "a one-character name",
    ...validCustomerFields,
    customerName: "A",
    expectedError: "Enter a customer name",
  },
  {
    name: "a name over 100 characters",
    ...validCustomerFields,
    customerName: "A".repeat(101),
    expectedError: /100 characters/i,
  },
  {
    name: "an invalid email address",
    ...validCustomerFields,
    customerEmail: "not-an-email",
    expectedError: "Enter a valid email",
  },
  {
    name: "a missing phone number",
    ...validCustomerFields,
    customerPhone: "",
    expectedError: "Enter a phone number",
  },
  {
    name: "a phone number under 8 characters",
    ...validCustomerFields,
    customerPhone: "1234567",
    expectedError: "Enter a phone number",
  },
  {
    name: "a phone number over 20 characters",
    ...validCustomerFields,
    customerPhone: "1".repeat(21),
    expectedError: /20 characters/i,
  },
  {
    name: "notes over 500 characters",
    ...validCustomerFields,
    notes: "N".repeat(501),
    expectedError: /500 characters/i,
  },
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

type InvalidApiBookingCase = {
  name: string;
  makeInvalid: (payload: BookingPayload) => BookingPayload;
  expectedError: RegExp;
};

function invalidApiBookingCase(
  name: string,
  fields: Partial<BookingPayload>,
  expectedError: RegExp,
): InvalidApiBookingCase {
  return {
    name,
    makeInvalid: (payload) => ({ ...payload, ...fields }),
    expectedError,
  };
}

const invalidApiBookingCases: InvalidApiBookingCase[] = [
  invalidApiBookingCase(
    "a non-positive service ID",
    { serviceId: 0 },
    /select a service/i,
  ),
  invalidApiBookingCase(
    "a malformed date",
    { date: "not-a-date" },
    /choose a valid date/i,
  ),
  invalidApiBookingCase(
    "a future date that does not exist on the calendar",
    { date: INVALID_FUTURE_CALENDAR_DATE },
    /choose a valid date/i,
  ),
  invalidApiBookingCase(
    "a past date",
    { date: dateAfter(-1) },
    /choose today or a future date/i,
  ),
  invalidApiBookingCase(
    "an unsupported time slot",
    { timeSlot: "12:00" },
    /choose an available time/i,
  ),
  invalidApiBookingCase(
    "a blank customer name",
    { customerName: "   " },
    /enter a customer name/i,
  ),
  invalidApiBookingCase(
    "a customer name over 100 characters",
    { customerName: "N".repeat(101) },
    /100 characters/i,
  ),
  invalidApiBookingCase(
    "an invalid email address",
    { customerEmail: "not-an-email" },
    /valid email/i,
  ),
  invalidApiBookingCase(
    "a phone number under 8 characters",
    { customerPhone: "1234567" },
    /enter a phone number/i,
  ),
  invalidApiBookingCase(
    "a phone number over 20 characters",
    { customerPhone: "1".repeat(21) },
    /20 characters/i,
  ),
  invalidApiBookingCase(
    "notes over 500 characters",
    { notes: "N".repeat(501) },
    /500 characters/i,
  ),
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
  const payload = makeBookingPayload(serviceId, {
    date: dateAfter(DUPLICATE_BOOKING_DATE_OFFSET),
  });

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
  expect(created.customer).toMatchObject({
    name: payload.customerName,
    email: payload.customerEmail,
    phone: payload.customerPhone,
  });
  expect(created.service).toMatchObject({ id: serviceId, name: "Personal consultation" });

  await openDateAndTimeStep(page);
  await fillDateAndWaitForAvailability(page, payload.date);
  await expect(page.getByRole("button", { name: payload.timeSlot, exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "15:00", exact: true })).toBeEnabled();

  const duplicateResponse = await page.request.post("/api/bookings", { data: payload });
  expect(duplicateResponse.status()).toBe(409);
  await expect(duplicateResponse.json()).resolves.toEqual({
    error: "This time is already booked. Choose another slot.",
  });

  const searchResponse = await page.request.get(`/api/bookings?search=${encodeURIComponent(payload.customerName)}`);
  expect(searchResponse.status()).toBe(200);
  const searchResult = (await searchResponse.json()) as {
    total: number;
    items: Array<{ reference: string; customer: { email: string } }>;
  };
  expect(searchResult.total).toBe(1);
  expect(searchResult.items).toHaveLength(1);
  expect(searchResult.items[0]).toMatchObject({
    reference: created.reference,
    customer: { email: payload.customerEmail },
  });
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

test("preserves entered details when navigating back and clears a slot when the date changes", async ({ page }) => {
  await loginAs(page, "staff");
  const date = dateAfter(7);
  await openDateAndTimeStep(page, "Career coaching");
  await fillDateAndWaitForAvailability(page, date);
  await page.getByRole("button", { name: "15:00", exact: true }).click();
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByLabel("Full name").fill("Persistent Guest");
  await page.getByLabel("Email address").fill("persistent@example.com");
  await page.getByLabel("Phone number").fill("09012345678");
  await page.getByLabel("Notes (optional)").fill("Keep these details while navigating");
  await page.getByRole("button", { name: /continue/i }).click();
  await expect(page.getByRole("heading", { name: "Review & confirm", exact: true })).toBeVisible();

  await page.getByRole("button", { name: /back/i }).click();
  await expect(page.getByLabel("Full name")).toHaveValue("Persistent Guest");
  await expect(page.getByLabel("Email address")).toHaveValue("persistent@example.com");
  await expect(page.getByLabel("Phone number")).toHaveValue("09012345678");
  await expect(page.getByLabel("Notes (optional)")).toHaveValue("Keep these details while navigating");
  await page.getByRole("button", { name: /back/i }).click();
  await expect(page.getByLabel("Booking date")).toHaveValue(date);
  await expect(page.getByRole("button", { name: "15:00", exact: true })).toBeEnabled();

  await fillDateAndWaitForAvailability(page, dateAfter(8));
  await expect(page.getByText("Time", { exact: true }).locator("..")).toContainText("Not selected");
});

test("keeps the review screen and explains when the selected time becomes unavailable", async ({ page }) => {
  await loginAs(page, "staff");
  await openDateAndTimeStep(page, "Career coaching");
  await fillDateAndWaitForAvailability(page, dateAfter(12));
  await page.getByRole("button", { name: "17:00", exact: true }).click();
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByLabel("Full name").fill("Conflict Guest");
  await page.getByLabel("Email address").fill("conflict@example.com");
  await page.getByLabel("Phone number").fill("09012345678");
  await page.getByRole("button", { name: /continue/i }).click();

  let createRequests = 0;
  await page.route("**/api/bookings", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    createRequests += 1;
    await route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({ error: "This time is already booked. Choose another slot." }),
    });
  });
  await page.getByRole("button", { name: /confirm booking/i }).click();
  await expect(getAppAlert(page)).toHaveText("This time is already booked. Choose another slot.");
  await expect(page.getByRole("heading", { name: "Review & confirm", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /booking confirmed/i })).toHaveCount(0);
  expect(createRequests).toBe(1);
});
