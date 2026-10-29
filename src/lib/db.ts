import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";

function makeClient() {
  const filename = path.resolve(process.cwd(), "data", process.env.DATABASE_FILE || "dev.db");
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: `file:${filename}` }) });
}

const globalForPrisma = globalThis as typeof globalThis & { bookingPrisma?: PrismaClient };

export const prisma = globalForPrisma.bookingPrisma ?? makeClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.bookingPrisma = prisma;
