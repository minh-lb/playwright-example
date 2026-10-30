import { setTimeout as delay } from "node:timers/promises";
import { processNextJob } from "../src/lib/job-queue";
import { prisma } from "../src/lib/db";

let running = true;
process.on("SIGINT", () => { running = false; });
process.on("SIGTERM", () => { running = false; });

async function main() {
  console.log("Job queue worker started");
  try {
    while (running) {
      try {
        const processed = await processNextJob();
        if (!processed) await delay(300);
      } catch (error) {
        console.error("Queue worker error:", error);
        await delay(1000);
      }
    }
  } finally {
    await prisma.$disconnect();
    console.log("Job queue worker stopped");
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
