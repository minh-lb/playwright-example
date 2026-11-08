import { NextResponse } from "next/server";
import { getActor } from "@/lib/permissions";
import { requestBackend } from "@/lib/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ path: string[] }> };

async function proxy(request: Request, context: Context) {
  const { path } = await context.params;
  if (!path?.length || path.some((segment) => segment === "." || segment === "..")) {
    return NextResponse.json({ error: "Invalid route" }, { status: 400 });
  }

  const isHealth = path.length === 1 && path[0] === "health" && request.method === "GET";
  const actor = isHealth ? undefined : await getActor();
  if (!isHealth && !actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const input = new URL(request.url);
  const backendPath = "/api/" + path.map(encodeURIComponent).join("/") + input.search;
  const body = request.method === "GET" || request.method === "HEAD" ? "" : await request.text();
  try {
    const backend = await requestBackend(
      request.method, backendPath, actor || undefined, body,
      body ? request.headers.get("content-type") || "application/json" : undefined,
    );
    return new Response(backend.body, {
      status: backend.status,
      headers: { "Content-Type": backend.headers.get("content-type") || "application/json", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Backend request failed:", error);
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
}

export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE };
