import { describe, expect, it } from "vitest";
import { BOOKING_TIMES, formatMoney, validateBooking } from "../../src/lib/booking";

const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

const payload = {
  serviceId: 1,
  date: tomorrow,
  timeSlot: "10:00",
  customerName: "Minh Luu",
  customerEmail: "minh@example.com",
  customerPhone: "0901234567",
  notes: "Window seat",
};

describe("booking validation", () => {
  it("accepts a complete booking request", () => {
    expect(validateBooking(payload).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(validateBooking({ ...payload, customerEmail: "invalid" }).success).toBe(false);
  });

  it("rejects a missing service", () => {
    expect(validateBooking({ ...payload, serviceId: 0 }).success).toBe(false);
  });

  it("rejects a past date", () => {
    expect(validateBooking({ ...payload, date: "2021-01-01" }).success).toBe(false);
  });

  it("rejects a slot that is not offered", () => {
    expect(validateBooking({ ...payload, timeSlot: "02:30" }).success).toBe(false);
  });

  it("offers an explicit set of daytime slots", () => {
    expect(BOOKING_TIMES).toContain("10:00");
    expect(BOOKING_TIMES).not.toContain("02:30");
  });

  it("formats money as VND", () => {
    expect(formatMoney(250000)).toMatch(/250[.,]000/);
  });
});
