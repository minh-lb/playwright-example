import { redirect } from "next/navigation";
import { getActor } from "@/lib/permissions";
import { QueueManager } from "@/components/queue-manager";

export default async function QueuePage() {
  const actor = await getActor();
  if (actor?.role !== "admin") redirect("/dashboard");
  return <QueueManager />;
}
