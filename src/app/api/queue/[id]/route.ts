import { NextResponse } from "next/server";
import { z } from "zod";
import { getActor } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { retryFailedJob } from "@/lib/job-queue";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (actor.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const id = Number((await context.params).id);
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
  const input = z.object({ action: z.literal("retry") }).safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Invalid job action" }, { status: 400 });

  const existing = await prisma.job.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (!await retryFailedJob(id)) {
    return NextResponse.json({ error: "Only failed jobs can be retried" }, { status: 409 });
  }
  return NextResponse.json(await prisma.job.findUnique({ where: { id } }));
}
