import { randomBytes } from "node:crypto";
import { bookingSchema, type BookingInput } from "./booking";
import { prisma } from "./db";

export class BookingConflictError extends Error {
  constructor() {
    super("This time is already booked. Choose another slot.");
    this.name = "BookingConflictError";
  }
}

export class ServiceUnavailableError extends Error {
  constructor() {
    super("The selected service is unavailable.");
    this.name = "ServiceUnavailableError";
  }
}

export async function createBooking(input: BookingInput, createdBy: string) {
  const data = bookingSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const service = await tx.service.findUnique({ where: { id: data.serviceId } });
    if (!service?.active) throw new ServiceUnavailableError();

    const existing = await tx.booking.findFirst({
      where: { serviceId: data.serviceId, date: data.date, timeSlot: data.timeSlot, status: { not: "CANCELED" } },
    });
    if (existing) throw new BookingConflictError();

    const customer = await tx.customer.upsert({
      where: { email: data.customerEmail },
      update: { name: data.customerName, phone: data.customerPhone },
      create: { name: data.customerName, email: data.customerEmail, phone: data.customerPhone },
    });

    const booking = await tx.booking.create({
      data: {
        reference: `BK-${randomBytes(4).toString("hex").toUpperCase()}`,
        serviceId: service.id,
        customerId: customer.id,
        date: data.date,
        timeSlot: data.timeSlot,
        notes: data.notes,
        createdBy,
      },
      include: { service: true, customer: true },
    });

    // The booking and notification job either both commit or both roll back.
    await tx.job.create({
      data: { type: "BOOKING_CONFIRMATION", bookingId: booking.id },
    });
    return booking;
  });
}
