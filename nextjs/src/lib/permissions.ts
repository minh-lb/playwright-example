import { auth } from "../auth";
import type { AppRole } from "./roles";

export async function getActor(): Promise<{ email: string; name: string; role: AppRole } | null> {
  const session = await auth();
  const role = (session?.user as { role?: AppRole | null } | undefined)?.role;
  if (!session?.user?.email || !role) return null;
  return {
    email: session.user.email,
    name: session.user.name || session.user.email,
    role,
  };
}

export async function requireActor() {
  const actor = await getActor();
  if (!actor) throw new Error("UNAUTHORIZED");
  return actor;
}

export async function requireAdmin() {
  const actor = await requireActor();
  if (actor.role !== "admin") throw new Error("FORBIDDEN");
  return actor;
}
