import { createHash, createHmac } from "node:crypto";
import type { AppRole } from "./roles";

export type Actor = { email: string; name: string; role: AppRole };

const backendOrigin = process.env.BACKEND_INTERNAL_URL || "http://laravel";
const secret = process.env.INTERNAL_API_SECRET || "";

export async function requestBackend(
  method: string,
  path: string,
  actor?: Actor,
  body = "",
  contentType?: string,
): Promise<Response> {
  if (!path.startsWith("/api/")) throw new Error("Invalid internal API path");
  if (!secret || secret.length < 24) throw new Error("INTERNAL_API_SECRET must contain at least 24 characters");
  const url = new URL(path, backendOrigin);
  url.searchParams.sort();
  const signedPath = url.pathname + url.search;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const payload = [
    timestamp,
    method.toUpperCase(),
    signedPath,
    createHash("sha256").update(body).digest("hex"),
    actor?.email || "",
    actor?.role || "",
  ].join("\n");
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return fetch(url, {
    method,
    cache: "no-store",
    headers: {
      "Accept": "application/json",
      ...(contentType ? { "Content-Type": contentType } : {}),
      ...(actor ? {
        "X-Frontend-Timestamp": timestamp,
        "X-Frontend-Identity": actor.email,
        "X-Frontend-Role": actor.role,
        "X-Frontend-Signature": signature,
      } : {}),
    },
    ...(["GET", "HEAD"].includes(method.toUpperCase()) ? {} : { body }),
  });
}

export async function getBackendJson<T>(path: string, actor: Actor): Promise<T> {
  const response = await requestBackend("GET", path, actor);
  if (!response.ok) throw new Error("Backend API unavailable: " + response.status);
  return response.json() as Promise<T>;
}
