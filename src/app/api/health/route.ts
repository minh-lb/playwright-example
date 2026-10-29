import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await prisma.service.count();
    return NextResponse.json({ status: "ok", database: process.env.DATABASE_FILE === "test.db" ? "test" : "dev" });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
