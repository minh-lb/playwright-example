import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { getActor } from "@/lib/permissions";
import { serviceSchema } from "@/lib/services";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (actor.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "Invalid service" }, { status: 400 });
  try {
    const data = serviceSchema.partial().parse(await request.json());
    const service = await prisma.service.update({ where: { id }, data });
    return NextResponse.json(service);
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message || "Invalid input" }, { status: 400 });
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (actor.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "Invalid service" }, { status: 400 });
  try {
    // Archive rather than remove historical bookings.
    await prisma.service.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }
}
