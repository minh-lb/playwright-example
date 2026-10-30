import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db";

// Only the isolated Playwright database may be modified by this script.
if (process.env.DATABASE_FILE !== "test.db") {
  throw new Error("Queue test fixtures require DATABASE_FILE=test.db");
}

async function main() {
  const [action, ...rest] = process.argv.slice(2);
  if (action === "seed") {
    const marker = `queue-pagination-${randomUUID()}`;
    await prisma.job.createMany({
      data: Array.from({ length: 102 }, () => ({
        type: "DEMO", status: "FAILED", attempts: 3,
        lastError: marker, failUntilAttempt: 3,
      })),
    });
    const jobs = await prisma.job.findMany({
      where: { lastError: marker },
      select: { id: true },
      orderBy: { id: "asc" },
    });
    process.stdout.write(JSON.stringify(jobs.map((job) => job.id)));
  } else if (action === "cleanup") {
    const ids = rest.map(Number);
    if (ids.length === 0 || ids.some((id) => !Number.isSafeInteger(id) || id < 1)) {
      throw new Error("Expected valid fixture job IDs");
    }
    await prisma.job.deleteMany({ where: { id: { in: ids } } });
  } else {
    throw new Error(`Unsupported fixture action: ${action}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
