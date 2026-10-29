import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getActor } from "@/lib/permissions";
import { canChangeBookingStatus, type BookingStatus } from "@/lib/booking-status";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "Invalid booking" }, { status: 400 });
  const parsed = z.object({ status: z.enum(["CONFIRMED", "COMPLETED", "CANCELED"]) }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (!canChangeBookingStatus(booking.status as BookingStatus, parsed.data.status)) {
    return NextResponse.json({ error: "This booking can no longer change status" }, { status: 409 });
  }
  const updated = await prisma.booking.update({ where: { id }, data: { status: parsed.data.status }, include: { service: true, customer: true } });
  return NextResponse.json(updated);
}
