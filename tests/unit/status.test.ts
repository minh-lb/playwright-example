import { describe, expect, it } from "vitest";
import { canChangeBookingStatus } from "../../src/lib/booking-status";

describe("booking status transitions", () => {
  it("allows an upcoming booking to complete or cancel", () => {
    expect(canChangeBookingStatus("CONFIRMED", "COMPLETED")).toBe(true);
    expect(canChangeBookingStatus("CONFIRMED", "CANCELED")).toBe(true);
  });

  it("does not reopen completed or cancelled bookings", () => {
    expect(canChangeBookingStatus("CANCELED", "CONFIRMED")).toBe(false);
    expect(canChangeBookingStatus("COMPLETED", "CANCELED")).toBe(false);
  });
});
