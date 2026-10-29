import { NextResponse } from "next/server";
import { ZodError } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getActor } from "@/lib/permissions";
import {
  BookingConflictError,
  createBooking,
  ServiceUnavailableError,
} from "@/lib/booking-rules";

export const runtime = "nodejs";

const BOOKING_PAGE_SIZE = 8;

export async function GET(request: Request) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const search = params.get("search")?.trim() || "";
  const status = params.get("status") || "";
  const sort = params.get("sort") === "oldest" ? "asc" : "desc";
  const where: Prisma.BookingWhereInput = {
    ...(search
      ? {
          OR: [
            { reference: { contains: search } },
            { customer: { name: { contains: search } } },
            { service: { name: { contains: search } } },
          ],
        }
      : {}),
    ...(status && status !== "All" ? { status } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: [{ createdAt: sort }, { id: sort }],
      skip: (page - 1) * BOOKING_PAGE_SIZE,
      take: BOOKING_PAGE_SIZE,
      include: { service: true, customer: true },
    }),
    prisma.booking.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pageSize: BOOKING_PAGE_SIZE });
}

export async function POST(request: Request) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const booking = await createBooking(await request.json(), actor.email);
    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Invalid booking" },
        { status: 400 },
      );
    }
    if (error instanceof BookingConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof ServiceUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not create booking" }, { status: 500 });
  }
}
