import { redirect } from "next/navigation";
import { ServicesManager } from "@/components/services-manager";
import { getActor } from "@/lib/permissions";

export default async function ServicesPage() {
  const actor = await getActor();
  if (actor?.role !== "admin") redirect("/dashboard");
  return <ServicesManager/>;
}
