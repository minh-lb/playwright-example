import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";

export type BookingPayload = {
  serviceId: number;
  date: string;
  timeSlot: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string;
};

export type CreatedBooking = {
  id: number;
  reference: string;
  status: "CONFIRMED" | "COMPLETED" | "CANCELED";
  date: string;
  timeSlot: string;
  notes: string;
  customer: { name: string; email: string; phone: string };
  service: { id: number; name: string; price: number; durationMinutes: number };
};

const DEFAULT_BOOKING_DATE_OFFSET = 7;
const DEFAULT_BOOKING_TIME = "16:00";
const DEFAULT_CUSTOMER_PHONE = "09099887766";

export const INVALID_FUTURE_CALENDAR_DATE = `${new Date().getUTCFullYear() + 1}-02-31`;

export function uniqueToken(): string {
  return randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
}

export function dateAfter(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function makeBookingPayload(
  serviceId: number,
  overrides: Partial<BookingPayload> = {},
): BookingPayload {
  const token = uniqueToken();
  return {
    serviceId,
    date: dateAfter(DEFAULT_BOOKING_DATE_OFFSET),
    timeSlot: DEFAULT_BOOKING_TIME,
    customerName: `E2E Guest ${token}`,
    customerEmail: `e2e-${token.toLowerCase()}@example.com`,
    customerPhone: DEFAULT_CUSTOMER_PHONE,
    notes: "",
    ...overrides,
  };
}

export async function getServiceId(
  page: Page,
  name = "Personal consultation",
): Promise<number> {
  const response = await page.request.get("/api/services?active=true&limit=50");
  expect(response.status()).toBe(200);
  const result = (await response.json()) as {
    items: Array<{ id: number; name: string }>;
  };
  const service = result.items.find((item) => item.name === name);
  if (!service) throw new Error(`Expected active service “${name}” in the test database`);
  return service.id;
}

export async function createBooking(
  page: Page,
  payload: BookingPayload,
): Promise<CreatedBooking> {
  const response = await page.request.post("/api/bookings", { data: payload });
  expect(response.status()).toBe(201);
  return (await response.json()) as CreatedBooking;
}
