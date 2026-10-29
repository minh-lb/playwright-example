import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getActor } from "@/lib/permissions";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  if (!actor) redirect("/login");
  return <AppShell user={actor}>{children}</AppShell>;
}
