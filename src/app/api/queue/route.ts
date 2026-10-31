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

const PAGE_SIZE = 100;
const listSchema = z.object({
  status: z.enum(["ALL", "PENDING", "PROCESSING", "COMPLETED", "FAILED"]).default("ALL"),
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
});

export async function GET(request: Request) {
  const denied = await adminAccess();
  if (denied) return denied;

  const url = new URL(request.url);
  const parsed = listSchema.safeParse({
    status: url.searchParams.get("status") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "Invalid queue filters" }, { status: 400 });

  const values = await Promise.all(JOB_STATUSES.map((status) => prisma.job.count({ where: { status } })));
  const counts = Object.fromEntries(JOB_STATUSES.map((status, index) => [status, values[index]]));
  const total = parsed.data.status === "ALL"
    ? values.reduce((sum, count) => sum + count, 0)
    : counts[parsed.data.status];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(parsed.data.page, totalPages);
  const items = await prisma.job.findMany({
    where: parsed.data.status === "ALL" ? {} : { status: parsed.data.status },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: { booking: { select: { reference: true } } },
  });
  return NextResponse.json({ items, counts, page, totalPages, total });
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
