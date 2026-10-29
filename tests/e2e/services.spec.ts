import { expect, test } from "@playwright/test";
import { getAppAlert, getToast, loginAs } from "./helpers";
import { createBooking, makeBookingPayload, uniqueToken } from "./test-data";

const SERVICE_PAGE_SIZE = 6;
const SERVICE_SEARCH_LIMIT = 50;
const APP_ORIGIN = "http://localhost:3000";

type ServiceRecord = {
  id: number;
  name: string;
  description: string;
  price: number;
  active: boolean;
};

const validService = (name: string) => ({
  name,
  description: "An E2E service used to verify service management.",
  category: "Coaching",
  durationMinutes: 60,
  price: 250000,
  color: "indigo",
  active: true,
});

function serviceSearchUrl(search: string, activeOnly = false) {
  const query = new URLSearchParams({
    search,
    limit: String(SERVICE_SEARCH_LIMIT),
  });
  if (activeOnly) query.set("active", "true");
  return "/api/services?" + query.toString();
}

function bookingSearchUrl(search: string) {
  const query = new URLSearchParams({ search });
  return "/api/bookings?" + query.toString();
}

test.describe("service management", () => {
  test("searches, filters by category, and paginates the service list", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/services");

    const rows = page.locator("tbody tr");
    const allResponse = await page.request.get("/api/services?limit=50");
    const allServices = await allResponse.json() as { total: number };
    await expect(rows).toHaveCount(Math.min(allServices.total, SERVICE_PAGE_SIZE));
    const firstPageRange = `Showing 1–${Math.min(allServices.total, SERVICE_PAGE_SIZE)} of ${allServices.total}`;
    await expect(page.getByText(firstPageRange)).toBeVisible();

    await page.getByLabel("Filter services by category").selectOption("Wellness");
    const wellnessResponse = await page.request.get("/api/services?category=Wellness&limit=50");
    const wellness = await wellnessResponse.json() as { total: number; items: Array<{ name: string }> };
    await expect(rows).toHaveCount(wellness.total);
    for (const service of wellness.items) {
      await expect(rows.filter({ hasText: service.name })).toHaveCount(1);
    }

    await page.getByLabel("Filter services by category").selectOption("All");
    await page.getByPlaceholder("Search services...").fill("Career coaching");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Career coaching");
    await expect(page.getByText("Showing 1–1 of 1")).toBeVisible();

    const descriptionToken = uniqueToken();
    const descriptionOnlyService = "Description search " + uniqueToken();
    const descriptionServiceResponse = await page.request.post("/api/services", {
      data: {
        ...validService(descriptionOnlyService),
        description: "Search this description using " + descriptionToken + ".",
      },
    });
    expect(descriptionServiceResponse.status()).toBe(201);
    await page.getByPlaceholder("Search services...").fill(descriptionToken);
    const descriptionRow = rows.filter({ hasText: descriptionOnlyService });
    await expect(descriptionRow).toHaveCount(1);
    await expect(descriptionRow).toContainText(descriptionToken);

    const token = uniqueToken();
    const created = await page.request.post("/api/services", { data: validService(`Page service ${token}`) });
    expect(created.status()).toBe(201);
    const updatedList = await page.request.get("/api/services?limit=50");
    const updatedServices = await updatedList.json() as {
      total: number;
      items: Array<{ name: string }>;
    };
    await page.getByPlaceholder("Search services...").fill("");
    await page.reload();

    await expect(rows).toHaveCount(SERVICE_PAGE_SIZE);
    const firstPageNames = updatedServices.items
      .slice(0, SERVICE_PAGE_SIZE)
      .map((service) => service.name);
    for (const serviceName of firstPageNames) {
      await expect(rows.filter({ hasText: serviceName })).toHaveCount(1);
    }
    await page.getByRole("button", { name: "Next", exact: true }).click();
    const secondPageCount = Math.min(updatedServices.total - SERVICE_PAGE_SIZE, SERVICE_PAGE_SIZE);
    await expect(rows).toHaveCount(secondPageCount);
    const secondPageNames = updatedServices.items
      .slice(SERVICE_PAGE_SIZE, SERVICE_PAGE_SIZE * 2)
      .map((service) => service.name);
    for (const serviceName of secondPageNames) {
      await expect(rows.filter({ hasText: serviceName })).toHaveCount(1);
    }
    for (const serviceName of secondPageNames) {
      expect(firstPageNames).not.toContain(serviceName);
    }
    const lastVisibleService = Math.min(updatedServices.total, SERVICE_PAGE_SIZE * 2);
    await expect(page.getByText(`Showing 7–${lastVisibleService} of ${updatedServices.total}`)).toBeVisible();
    if (updatedServices.total <= 12) {
      await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
    }
    await page.getByRole("button", { name: "Previous", exact: true }).click();
    await expect(rows).toHaveCount(SERVICE_PAGE_SIZE);

    const createdPage = Math.floor((updatedServices.total - 1) / SERVICE_PAGE_SIZE) + 1;
    for (let currentPage = 1; currentPage < createdPage; currentPage += 1) {
      await page.getByRole("button", { name: "Next", exact: true }).click();
    }
    await expect(rows.filter({ hasText: `Page service ${token}` })).toHaveCount(1);
  });

  test("validates, creates, edits, and deactivates a service from the UI", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/services");
    const token = uniqueToken();
    const serviceName = `UI service ${token}`;
    let createRequests = 0;
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (request.method() === "POST" && url.pathname === "/api/services") createRequests += 1;
    });

    await page.getByRole("button", { name: /add service/i }).click();
    await page.getByRole("button", { name: /save service/i }).click();
    await expect(getAppAlert(page)).toHaveText("Enter a service name");
    await page.getByLabel("Service name").fill("A");
    await page.getByLabel("Description").fill("A sufficiently long description.");
    await page.getByRole("button", { name: /save service/i }).click();
    await expect(getAppAlert(page)).toHaveText("Enter a service name");
    await page.getByLabel("Service name").fill(serviceName);
    await page.getByLabel("Description").fill("Four");
    await page.getByRole("button", { name: /save service/i }).click();
    await expect(getAppAlert(page)).toHaveText("Describe this service");
    await page.getByLabel("Description").fill("A complete description for this E2E service.");
    await page.getByLabel("Price (VND)").fill("0");
    await page.getByRole("button", { name: /save service/i }).click();
    await expect(getAppAlert(page)).toHaveText("Price must be greater than zero");
    expect(createRequests).toBe(0);

    await page.getByLabel("Category", { exact: true }).selectOption("Wellness");
    await page.getByLabel("Duration").selectOption("90");
    await page.getByLabel("Price (VND)").fill("375000");
    await page.getByLabel("Accent color").selectOption("rose");
    await page.getByRole("button", { name: /save service/i }).click();
    await expect(getToast(page, "New service added")).toBeVisible();
    expect(createRequests).toBe(1);

    const search = page.getByPlaceholder("Search services...");
    await search.fill(serviceName);
    const row = page.locator("tbody tr").filter({ hasText: serviceName });
    await expect(row).toContainText("Wellness");
    await expect(row).toContainText("90 min");
    await expect(row).toContainText("active");
    const serviceResponse = await page.request.get(serviceSearchUrl(serviceName));
    expect(serviceResponse.status()).toBe(200);
    const serviceResult = (await serviceResponse.json()) as {
      items: ServiceRecord[];
    };
    expect(serviceResult.items).toHaveLength(1);
    const serviceId = serviceResult.items[0].id;
    expect(serviceResult.items[0]).toMatchObject({ name: serviceName, price: 375000, active: true });

    await row.getByRole("button", { name: `Edit ${serviceName}` }).click();
    await page.getByLabel("Service name").fill(`Updated ${token}`);
    await page.getByLabel("Description").fill("Updated details for the E2E service.");
    await page.getByLabel("Price (VND)").fill("425000");
    await page.getByLabel("Active and available to book").uncheck();
    await page.getByRole("button", { name: /save service/i }).click();
    await expect(getToast(page, "Service updated")).toBeVisible();
    await search.fill(`Updated ${token}`);
    await expect(page.locator("tbody tr")).toContainText("archived");

    const updatedResponse = await page.request.get(serviceSearchUrl(token));
    expect(updatedResponse.status()).toBe(200);
    const updated = (await updatedResponse.json()) as {
      items: ServiceRecord[];
    };
    expect(updated.items).toEqual([
      expect.objectContaining({
        id: serviceId,
        name: `Updated ${token}`,
        description: "Updated details for the E2E service.",
        price: 425000,
        active: false,
      }),
    ]);
    const availableResponse = await page.request.get(serviceSearchUrl(token, true));
    expect((await availableResponse.json() as { items: unknown[] }).items).toHaveLength(0);
  });

  test("keeps a service when archive is dismissed and archives it only after confirmation", async ({ page }) => {
    await loginAs(page, "admin");
    const token = uniqueToken();
    const name = `Archive service ${token}`;
    const created = await page.request.post("/api/services", { data: validService(name) });
    expect(created.status()).toBe(201);
    const serviceId = (await created.json() as { id: number }).id;
    const historicalBooking = await createBooking(page, makeBookingPayload(serviceId));

    await page.goto("/services");
    await page.getByPlaceholder("Search services...").fill(name);
    const row = page.locator("tbody tr").filter({ hasText: name });
    await expect(row).toContainText("active");
    await row.getByRole("button", { name: `Archive ${name.toLowerCase()}` }).click();
    await expect(page.getByRole("dialog", { name: "Archive service" })).toContainText("Existing appointments are kept");
    await page.getByRole("button", { name: "Keep service" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    let response = await page.request.get(serviceSearchUrl(token));
    let result = (await response.json()) as {
      items: Array<{ active: boolean }>;
    };
    expect(result.items).toHaveLength(1);
    expect(result.items[0].active).toBe(true);

    await row.getByRole("button", { name: `Archive ${name.toLowerCase()}` }).click();
    await page.getByRole("button", { name: "Confirm archive" }).click();
    await expect(getToast(page, "Service archived")).toBeVisible();
    await expect(row).toContainText("archived");
    await expect(row.getByRole("button", { name: `Archive ${name.toLowerCase()}` })).toBeDisabled();

    response = await page.request.get(serviceSearchUrl(token));
    result = (await response.json()) as {
      items: Array<{ active: boolean }>;
    };
    expect(result.items).toHaveLength(1);
    expect(result.items[0].active).toBe(false);

    const historicalBookings = await page.request.get(
      bookingSearchUrl(historicalBooking.reference),
    );
    expect(historicalBookings.status()).toBe(200);
    const history = (await historicalBookings.json()) as {
      items: Array<{ reference: string; status: string; service: { name: string } }>;
    };
    expect(history.items).toHaveLength(1);
    expect(history.items[0]).toMatchObject({
      reference: historicalBooking.reference,
      status: "CONFIRMED",
      service: { name },
    });

    await page.goto("/bookings/new");
    await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0);
  });

  test("hides archived services from staff and rejects staff mutations", async ({ browser, page }) => {
    const adminContext = await browser.newContext({ baseURL: APP_ORIGIN });
    const adminPage = await adminContext.newPage();
    await loginAs(adminPage, "admin");
    const token = uniqueToken();
    const serviceName = "Staff access " + token;
    const created = await adminPage.request.post("/api/services", {
      data: validService(serviceName),
    });
    expect(created.status()).toBe(201);
    const serviceId = (await created.json() as { id: number }).id;

    await loginAs(page, "staff");
    await page.goto("/services");
    await expect(page).toHaveURL(APP_ORIGIN + "/dashboard");
    const services = await page.request.get(serviceSearchUrl(token));
    expect(services.status()).toBe(200);
    const staffServices = await services.json() as { items: ServiceRecord[] };
    expect(staffServices.items).toHaveLength(1);
    expect(staffServices.items[0]).toMatchObject({ name: serviceName, active: true });

    const payload = validService("Staff mutation " + token);
    const createResponse = await page.request.post("/api/services", { data: payload });
    expect(createResponse.status()).toBe(403);
    const updateResponse = await page.request.patch("/api/services/" + serviceId, {
      data: { name: "Unauthorized update" },
    });
    expect(updateResponse.status()).toBe(403);
    const deleteResponse = await page.request.delete("/api/services/" + serviceId);
    expect(deleteResponse.status()).toBe(403);

    const afterMutations = await adminPage.request.get(serviceSearchUrl(token));
    const unchanged = await afterMutations.json() as { items: ServiceRecord[] };
    expect(unchanged.items).toEqual([
      expect.objectContaining({ id: serviceId, name: serviceName, active: true }),
    ]);

    const archiveResponse = await adminPage.request.delete("/api/services/" + serviceId);
    expect(archiveResponse.status()).toBe(200);
    const archivedService = await page.request.get(serviceSearchUrl(token));
    expect(archivedService.status()).toBe(200);
    expect((await archivedService.json() as { items: unknown[] }).items).toHaveLength(0);
    await adminContext.close();
  });
  test("validates service API inputs and returns consistent missing-resource errors", async ({ page }) => {
    await loginAs(page, "admin");
    const invalidBodies = [
      { ...validService("Invalid " + uniqueToken()), name: "x" },
      { ...validService("Invalid " + uniqueToken()), name: "N".repeat(81) },
      { ...validService("Invalid " + uniqueToken()), category: "Other" },
      { ...validService("Invalid " + uniqueToken()), description: "Four" },
      { ...validService("Invalid " + uniqueToken()), description: "D".repeat(301) },
      { ...validService("Invalid " + uniqueToken()), durationMinutes: 0 },
      { ...validService("Invalid " + uniqueToken()), durationMinutes: 241 },
      { ...validService("Invalid " + uniqueToken()), durationMinutes: 60.5 },
      { ...validService("Invalid " + uniqueToken()), price: 0 },
      { ...validService("Invalid " + uniqueToken()), price: -1 },
      { ...validService("Invalid " + uniqueToken()), price: 1.5 },
      { ...validService("Invalid " + uniqueToken()), color: "magenta" },
      { ...validService("Invalid " + uniqueToken()), active: "true" },
    ];
    for (const body of invalidBodies) {
      const response = await page.request.post("/api/services", { data: body });
      expect(response.status()).toBe(400);
      expect(await response.json()).toHaveProperty("error");
    }

    const maximumValidService = {
      ...validService("S".repeat(80)),
      description: "D".repeat(300),
      durationMinutes: 240,
      price: 1,
    };
    const boundaryResponse = await page.request.post("/api/services", {
      data: maximumValidService,
    });
    expect(boundaryResponse.status()).toBe(201);
    expect(await boundaryResponse.json()).toMatchObject(maximumValidService);

    const minimumValidService = {
      ...validService("AB"),
      description: "12345",
      durationMinutes: 15,
      price: 1,
      active: false,
    };
    const minimumBoundaryResponse = await page.request.post("/api/services", {
      data: minimumValidService,
    });
    expect(minimumBoundaryResponse.status()).toBe(201);
    expect(await minimumBoundaryResponse.json()).toMatchObject(minimumValidService);

    const malformedIdResponse = await page.request.patch("/api/services/not-an-id", {
      data: { name: "Changed name" },
    });
    expect(malformedIdResponse.status()).toBe(400);
    expect((await page.request.delete("/api/services/0")).status()).toBe(400);
    const missingUpdateResponse = await page.request.patch("/api/services/999999", {
      data: { name: "Changed name" },
    });
    expect(missingUpdateResponse.status()).toBe(404);
    const missingDeleteResponse = await page.request.delete("/api/services/999999");
    expect(missingDeleteResponse.status()).toBe(404);
  });

  test("shows a clear error when the service list request fails", async ({ page }) => {
    await loginAs(page, "admin");
    await page.route("**/api/services?*", (route) => route.abort("failed"));
    await page.goto("/services");
    await expect(page.getByRole("heading", { name: "Could not load services" })).toBeVisible();
  });
});
