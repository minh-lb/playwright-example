import { prisma } from "../src/lib/db";
import { seedDatabase } from "./seed";

async function reset() {
  await prisma.job.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.service.deleteMany();
  await seedDatabase();
  console.log("Reset booking and queue database to demo fixtures");
}

reset().finally(() => prisma.$disconnect());
