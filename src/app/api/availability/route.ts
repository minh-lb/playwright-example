import { NextResponse } from "next/server";
import { isValidCalendarDate } from "@/lib/booking";
import { prisma } from "@/lib/db";
import { getActor } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const serviceId = Number(params.get("serviceId"));
  const date = params.get("date") || "";
  const validServiceId = Number.isInteger(serviceId) && serviceId > 0;
  if (!validServiceId || !isValidCalendarDate(date)) {
    return NextResponse.json({ error: "Invalid service or date" }, { status: 400 });
  }
  const bookings = await prisma.booking.findMany({
    where: { serviceId, date, status: { not: "CANCELED" } },
    select: { timeSlot: true },
  });
  return NextResponse.json({ booked: bookings.map((booking) => booking.timeSlot) });
}
