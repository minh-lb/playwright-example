import path from "node:path";
import { defineConfig } from "prisma/config";

const dbPath = path.resolve(process.cwd(), "data", process.env.DATABASE_FILE || "dev.db");

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url: `file:${dbPath}` },
});
