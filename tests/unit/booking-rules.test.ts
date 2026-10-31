import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/db";
import { BookingConflictError, createBooking } from "../../src/lib/booking-rules";

const date = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
let serviceId: number;

const details = () => ({
  serviceId,
  date,
  timeSlot: "10:00",
  customerName: "A Test User",
  customerEmail: "unit@example.com",
  customerPhone: "0901234567",
  notes: "",
});

describe("booking persistence", () => {
  beforeEach(async () => {
    await prisma.job.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.service.deleteMany();
    const service = await prisma.service.create({
      data: { slug: "unit-service", name: "Unit service", description: "Test", category: "Wellness", durationMinutes: 60, price: 200000 },
    });
    serviceId = service.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("persists a booking and its customer", async () => {
    const booking = await createBooking(details(), "unit-test");
    const stored = await prisma.booking.findUnique({ where: { id: booking.id }, include: { customer: true } });
    expect(stored?.customer.email).toBe("unit@example.com");
    expect(stored?.status).toBe("CONFIRMED");
  });

  it("rejects an overlapping active booking", async () => {
    await createBooking(details(), "unit-test");
    await expect(createBooking(details(), "unit-test")).rejects.toBeInstanceOf(BookingConflictError);
    expect(await prisma.booking.count()).toBe(1);
  });

  it("reuses a time after cancelling an earlier booking", async () => {
    const first = await createBooking(details(), "unit-test");
    await prisma.booking.update({ where: { id: first.id }, data: { status: "CANCELED" } });
    const second = await createBooking(details(), "unit-test");
    expect(second.id).not.toBe(first.id);
  });
});
