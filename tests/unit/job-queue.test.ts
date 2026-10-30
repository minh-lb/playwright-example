import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/db";
import { createBooking, BookingConflictError } from "../../src/lib/booking-rules";
import { claimNextJob, processNextJob, queueRetryAt, retryFailedJob, settleJobAttempt } from "../../src/lib/job-queue";

async function demo(failUntilAttempt = 0) {
  return prisma.job.create({ data: { type: "DEMO", failUntilAttempt } });
}

async function runDue() {
  // Advance a due date without sleeping; production worker still honors its delay.
  await prisma.job.updateMany({
    where: { status: "PENDING" },
    data: { runAt: new Date(0) },
  });
  return processNextJob();
}

beforeEach(async () => {
  await prisma.job.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.service.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("durable SQLite job queue", () => {
  it("enqueues exactly one confirmation with a booking, but none on conflict", async () => {
    const service = await prisma.service.create({
      data: { slug: "queue-unit", name: "Queue unit", description: "Test", category: "Wellness", durationMinutes: 60, price: 100000 },
    });
    const data = { serviceId: service.id, date: "2030-12-01", timeSlot: "10:00", customerName: "Queue Guest", customerEmail: "queue-unit@example.com", customerPhone: "0901234567", notes: "" };
    const booking = await createBooking(data, "unit");
    const job = await prisma.job.findUnique({ where: { bookingId: booking.id } });
    expect(job).toMatchObject({ type: "BOOKING_CONFIRMATION", status: "PENDING", attempts: 0 });
    await expect(createBooking(data, "unit")).rejects.toBeInstanceOf(BookingConflictError);
    expect(await prisma.job.count()).toBe(1);
  });

  it("claims due jobs FIFO and never claims the same job twice", async () => {
    const first = await demo();
    const second = await demo();
    const claimed = await claimNextJob();
    expect(claimed?.id).toBe(first.id);
    expect(claimed?.status).toBe("PROCESSING");
    expect(claimed?.attempts).toBe(1);
    expect((await claimNextJob())?.id).toBe(second.id);
    expect(await claimNextJob()).toBeNull();
  });

  it("only one concurrent worker can claim a single due job", async () => {
    const job = await demo();
    const claims = await Promise.all([claimNextJob(), claimNextJob()]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    expect(claims.find(Boolean)?.id).toBe(job.id);
    expect(await prisma.job.findUnique({ where: { id: job.id } })).toMatchObject({
      status: "PROCESSING", attempts: 1,
    });
  });

  it("rejects stale success and failure after a lease is reclaimed", async () => {
    const job = await demo();
    const firstClaim = await claimNextJob();
    expect(firstClaim?.id).toBe(job.id);
    await prisma.job.update({ where: { id: job.id }, data: { leaseUntil: new Date(0) } });
    const secondClaim = await claimNextJob();
    expect(secondClaim?.id).toBe(job.id);
    expect(secondClaim?.leaseToken).not.toBe(firstClaim?.leaseToken);
    expect(secondClaim?.attempts).toBe(2);

    expect(await settleJobAttempt(firstClaim!, { result: "stale success" })).toBe(false);
    expect(await settleJobAttempt(firstClaim!, { error: "stale failure" })).toBe(false);
    expect(await prisma.job.findUnique({ where: { id: job.id } })).toMatchObject({
      status: "PROCESSING", attempts: 2, leaseToken: secondClaim?.leaseToken,
    });

    expect(await settleJobAttempt(secondClaim!, { result: "current success" })).toBe(true);
    expect(await prisma.job.findUnique({ where: { id: job.id } })).toMatchObject({
      status: "COMPLETED", result: "current success", leaseToken: null,
    });
  });

  it("does not reclaim an exhausted lease indefinitely", async () => {
    const job = await prisma.job.create({
      data: { type: "DEMO", status: "PROCESSING", attempts: 3, leaseToken: "previous-claim", leaseUntil: new Date(0) },
    });
    expect(await claimNextJob()).toBeNull();
    expect(await prisma.job.findUnique({ where: { id: job.id } })).toMatchObject({
      status: "FAILED", attempts: 3, leaseToken: null,
    });
  });

  it("retries transient failures until the third attempt succeeds", async () => {
    const job = await demo(2);
    expect(await runDue()).toBe(true);
    expect(await prisma.job.findUnique({ where: { id: job.id } })).toMatchObject({ status: "PENDING", attempts: 1 });
    expect(await runDue()).toBe(true);
    expect(await prisma.job.findUnique({ where: { id: job.id } })).toMatchObject({ status: "PENDING", attempts: 2 });
    expect(await runDue()).toBe(true);
    expect(await prisma.job.findUnique({ where: { id: job.id } })).toMatchObject({ status: "COMPLETED", attempts: 3, result: "Demo job completed" });
    expect(queueRetryAt(2, new Date(1000)).getTime()).toBeGreaterThan(1000);
  });

  it("exhausts retries and allows an admin-initiated retry", async () => {
    const job = await demo(3);
    await runDue();
    await runDue();
    await runDue();
    expect(await prisma.job.findUnique({ where: { id: job.id } })).toMatchObject({ status: "FAILED", attempts: 3 });
    expect(await retryFailedJob(job.id)).toBe(true);
    expect(await prisma.job.findUnique({ where: { id: job.id } })).toMatchObject({ status: "PENDING", attempts: 0, failUntilAttempt: 0 });
    expect(await runDue()).toBe(true);
    expect(await prisma.job.findUnique({ where: { id: job.id } })).toMatchObject({ status: "COMPLETED", attempts: 1 });
    expect(await retryFailedJob(job.id)).toBe(false);
  });

  it("recovers a lease abandoned by a crashed worker", async () => {
    const job = await prisma.job.create({
      data: { type: "DEMO", status: "PROCESSING", attempts: 1, leaseUntil: new Date(0) },
    });
    const reclaimed = await claimNextJob();
    expect(reclaimed).toMatchObject({ id: job.id, status: "PROCESSING", attempts: 2 });
  });

  it("skips the confirmation if a booking was cancelled before the worker ran", async () => {
    const service = await prisma.service.create({
      data: { slug: "queue-cancel", name: "Queue cancel", description: "Test", category: "Wellness", durationMinutes: 60, price: 100000 },
    });
    const booking = await createBooking({ serviceId: service.id, date: "2030-12-02", timeSlot: "10:00", customerName: "Canceled Guest", customerEmail: "cancel-unit@example.com", customerPhone: "0901234567", notes: "" }, "unit");
    await prisma.booking.update({ where: { id: booking.id }, data: { status: "CANCELED" } });
    expect(await runDue()).toBe(true);
    const job = await prisma.job.findUnique({ where: { bookingId: booking.id } });
    expect(job).toMatchObject({ status: "COMPLETED", result: "Skipped: booking canceled" });
  });
});
