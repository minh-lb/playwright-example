import Link from "next/link";
import { Plus } from "lucide-react";
import { getBackendJson } from "@/lib/backend";
import { getActor } from "@/lib/permissions";
import { DashboardMetrics } from "@/components/page-parts/dashboard-metrics";
import { DashboardRecentBookings, type RecentBooking } from "@/components/page-parts/dashboard-recent-bookings";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const actor = await getActor();
  if (!actor) return null;
  const { bookings, upcoming, activeServices, clients, totalBookings } = await getBackendJson<{
    bookings: RecentBooking[]; upcoming: number; activeServices: number;
    clients: number; totalBookings: number;
  }>("/api/dashboard", actor);
  const todayLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  return <div className="space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="mb-1 text-[12px] font-semibold text-[#8d98ae]">{todayLabel}</div><h1 className="section-title">Good to see you, {actor?.name.split(" ")[0] || "there"} <span aria-hidden="true">👋</span></h1><p className="mt-2 text-[13px] text-[#8e99ae]">Here is what is happening in your booking workspace.</p></div><Link href="/bookings/new" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#6965e8] px-4 text-[13px] font-bold text-white shadow-[0_6px_18px_#6965e833] hover:bg-[#5753d7]"><Plus size={16}/> New booking</Link></div>
    <DashboardMetrics data={{ totalBookings, upcoming, activeServices, clients }}/>
    <DashboardRecentBookings bookings={bookings}/>
  </div>;
}
