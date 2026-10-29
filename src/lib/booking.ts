import { z } from "zod";

export const BOOKING_TIMES = [
  "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00",
] as const;

export const bookingSchema = z.object({
  serviceId: z.number().int().positive("Select a service"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date").refine(
    (date) => !Number.isNaN(Date.parse(date)) && date >= new Date().toISOString().slice(0, 10),
    "Choose today or a future date",
  ),
  timeSlot: z.string().refine((value) => BOOKING_TIMES.some((slot) => slot === value), "Choose an available time"),
  customerName: z.string().trim().min(2, "Enter a customer name").max(100),
  customerEmail: z.email("Enter a valid email"),
  customerPhone: z.string().trim().min(8, "Enter a phone number").max(20),
  notes: z.string().trim().max(500).default(""),
});

export type BookingInput = z.input<typeof bookingSchema>;
export type ParsedBooking = z.output<typeof bookingSchema>;

export function validateBooking(input: unknown) {
  return bookingSchema.safeParse(input);
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount);
}
