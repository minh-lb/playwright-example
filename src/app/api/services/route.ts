import { NextResponse } from "next/server";
import { ZodError } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getActor } from "@/lib/permissions";
import { serviceSchema, slugifyServiceName } from "@/lib/services";

export const runtime = "nodejs";

const DEFAULT_SERVICE_PAGE_SIZE = 6;
const MAX_SERVICE_PAGE_SIZE = 50;

export async function GET(request: Request) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = Math.min(
    MAX_SERVICE_PAGE_SIZE,
    Math.max(1, Number(params.get("limit")) || DEFAULT_SERVICE_PAGE_SIZE),
  );
  const search = params.get("search")?.trim() || "";
  const category = params.get("category") || "";
  const where: Prisma.ServiceWhereInput = {
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { description: { contains: search } },
          ],
        }
      : {}),
    ...(category && category !== "All" ? { category } : {}),
    ...(actor.role !== "admin" || params.get("active") === "true"
      ? { active: true }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.service.findMany({
      where,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { bookings: true } } },
    }),
    prisma.service.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}

export async function POST(request: Request) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (actor.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const data = serviceSchema.parse(await request.json());
    const slug = `${slugifyServiceName(data.name)}-${Date.now().toString(36)}`;
    const service = await prisma.service.create({ data: { ...data, slug } });
    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Invalid input" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Could not create service" }, { status: 500 });
  }
}
