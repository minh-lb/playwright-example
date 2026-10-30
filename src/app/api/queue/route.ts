import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getActor } from "@/lib/permissions";
import { JOB_STATUSES, MAX_JOB_ATTEMPTS } from "@/lib/job-queue";

export const runtime = "nodejs";

async function adminAccess() {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (actor.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  return null;
}

export async function GET() {
  const denied = await adminAccess();
  if (denied) return denied;

  const [items, ...values] = await Promise.all([
    prisma.job.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
      include: { booking: { select: { reference: true } } },
    }),
    ...JOB_STATUSES.map((status) => prisma.job.count({ where: { status } })),
  ]);
  const counts = Object.fromEntries(JOB_STATUSES.map((status, index) => [status, values[index]]));
  return NextResponse.json({ items, counts });
}

const createSchema = z.object({ scenario: z.enum(["success", "retry", "fail"]) });

export async function POST(request: Request) {
  const denied = await adminAccess();
  if (denied) return denied;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid demo scenario" }, { status: 400 });

  const failUntilAttempt = { success: 0, retry: 2, fail: MAX_JOB_ATTEMPTS }[parsed.data.scenario];
  const job = await prisma.job.create({
    data: { type: "DEMO", failUntilAttempt, maxAttempts: MAX_JOB_ATTEMPTS },
  });
  return NextResponse.json(job, { status: 201 });
}
