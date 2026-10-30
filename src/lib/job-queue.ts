import { prisma } from "./db";

export const JOB_STATUSES = ["PENDING", "PROCESSING", "COMPLETED", "FAILED"] as const;
export type JobStatus = typeof JOB_STATUSES[number];
export const MAX_JOB_ATTEMPTS = 3;
const LEASE_MS = 30_000;
const RETRY_BASE_MS = 600;

export function queueRetryAt(attempts: number, now = new Date()): Date {
  const delay = Math.min(30_000, RETRY_BASE_MS * 2 ** Math.max(0, attempts - 1));
  return new Date(now.getTime() + delay);
}

// Conditional updateMany acts as a compare-and-swap so two workers cannot claim
// the same pending (or abandoned processing) row concurrently.
export async function claimNextJob(now = new Date()) {
  const candidate = await prisma.job.findFirst({
    where: {
      OR: [
        { status: "PENDING", runAt: { lte: now } },
        { status: "PROCESSING", leaseUntil: { lte: now } },
      ],
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  if (!candidate) return null;

  const guard = {
    id: candidate.id,
    status: candidate.status,
    attempts: candidate.attempts,
    ...(candidate.status === "PENDING" ? { runAt: { lte: now } } : { leaseUntil: { lte: now } }),
  };

  // A worker dying during its final attempt must not leave a perpetual lease loop.
  if (candidate.attempts >= candidate.maxAttempts) {
    await prisma.job.updateMany({
      where: guard,
      data: { status: "FAILED", leaseUntil: null, lastError: "Worker lease expired after final attempt" },
    });
    return null;
  }

  const claimed = await prisma.job.updateMany({
    where: guard,
    data: {
      status: "PROCESSING",
      attempts: { increment: 1 },
      leaseUntil: new Date(now.getTime() + LEASE_MS),
      lastError: null,
    },
  });
  if (claimed.count !== 1) return null;
  return prisma.job.findUnique({ where: { id: candidate.id } });
}

export async function processNextJob(): Promise<boolean> {
  const job = await claimNextJob();
  if (!job) return false;

  try {
    let result: string;
    if (job.type === "DEMO") {
      if (job.attempts <= job.failUntilAttempt) throw new Error("Simulated queue failure");
      result = "Demo job completed";
    } else if (job.type === "BOOKING_CONFIRMATION" && job.bookingId !== null) {
      const booking = await prisma.booking.findUnique({
        where: { id: job.bookingId },
        include: { customer: true },
      });
      if (!booking) throw new Error("Booking for confirmation not found");
      // The demo records a confirmation outcome; it never sends email.
      result = booking.status === "CANCELED"
        ? "Skipped: booking canceled"
        : `Confirmation recorded for ${booking.reference} (${booking.customer.email})`;
    } else {
      throw new Error(`Unknown job type: ${job.type}`);
    }

    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        result,
        completedAt: new Date(),
        lastError: null,
        leaseUntil: null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const exhausted = job.attempts >= job.maxAttempts;
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: exhausted ? "FAILED" : "PENDING",
        lastError: message,
        runAt: exhausted ? job.runAt : queueRetryAt(job.attempts),
        leaseUntil: null,
      },
    });
  }
  return true;
}

export async function retryFailedJob(id: number): Promise<boolean> {
  const result = await prisma.job.updateMany({
    where: { id, status: "FAILED" },
    data: {
      status: "PENDING",
      attempts: 0,
      failUntilAttempt: 0,
      runAt: new Date(),
      leaseUntil: null,
      lastError: null,
      result: null,
      completedAt: null,
    },
  });
  return result.count === 1;
}
