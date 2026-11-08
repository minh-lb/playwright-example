import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers";
import { dateAfter, getServiceId, makeBookingPayload, uniqueToken } from "./test-data";

const UNAUTHORIZED_STATUS = 401;
const PROTECTED_API_REQUEST_COUNT = 8;
const CUSTOMER_UPSERT_DATE_OFFSETS = [230, 231] as const;

type CustomerContact = {
  id: number;
  name: string;
  email: string;
  phone: string;
};

test("all protected read and write APIs reject anonymous requests", async ({ page }) => {
  const requests = [
    page.request.get("/api/bookings"),
    page.request.get("/api/services"),
    page.request.get("/api/availability?serviceId=1&date=2027-01-01"),
    page.request.post("/api/bookings", { data: {} }),
    page.request.post("/api/services", { data: {} }),
    page.request.patch("/api/bookings/1", { data: { status: "COMPLETED" } }),
    page.request.patch("/api/services/1", { data: { name: "Unauthorized" } }),
    page.request.delete("/api/services/1"),
  ];
  const responses = await Promise.all(requests);
  expect(responses).toHaveLength(PROTECTED_API_REQUEST_COUNT);
  for (const response of responses) {
    expect(response.status()).toBe(UNAUTHORIZED_STATUS);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  }
});

test("reuses a customer by email while updating their latest contact details", async ({ page }) => {
  await loginAs(page, "staff");
  const serviceId = await getServiceId(page);
  const firstPayload = makeBookingPayload(serviceId, {
    customerName: "Original E2E Contact",
    customerEmail: `shared-${uniqueToken().toLowerCase()}@example.com`,
    customerPhone: "09011112222",
    date: dateAfter(CUSTOMER_UPSERT_DATE_OFFSETS[0]),
  });
  const firstResponse = await page.request.post("/api/bookings", { data: firstPayload });
  expect(firstResponse.status()).toBe(201);
  const first = (await firstResponse.json()) as {
    customer: Pick<CustomerContact, "id">;
  };

  const secondPayload = makeBookingPayload(serviceId, {
    customerName: "Updated E2E Contact",
    customerEmail: firstPayload.customerEmail,
    customerPhone: "09033334444",
    date: dateAfter(CUSTOMER_UPSERT_DATE_OFFSETS[1]),
  });
  const secondResponse = await page.request.post("/api/bookings", { data: secondPayload });
  expect(secondResponse.status()).toBe(201);
  const second = (await secondResponse.json()) as {
    customer: CustomerContact;
  };
  expect(second.customer).toMatchObject({
    id: first.customer.id,
    name: secondPayload.customerName,
    email: firstPayload.customerEmail,
    phone: secondPayload.customerPhone,
  });
});
