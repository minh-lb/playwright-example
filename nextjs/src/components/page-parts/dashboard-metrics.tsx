import { CalendarDays, CheckCircle2, Clock3, Users } from "lucide-react";
export type DashboardStats = { totalBookings: number; upcoming: number; activeServices: number; clients: number };
export function DashboardMetrics({ data }: { data: DashboardStats }) {
  const stats = [
    { label: "Total bookings", value: data.totalBookings, icon: CalendarDays, bg: "bg-[#eeedff]", color: "text-[#7772ed]", hint: "All time" },
    { label: "Upcoming", value: data.upcoming, icon: Clock3, bg: "bg-[#e8f6f2]", color: "text-[#36a887]", hint: "Confirmed appointments" },
    { label: "Active services", value: data.activeServices, icon: CheckCircle2, bg: "bg-[#fff4e8]", color: "text-[#d69a4c]", hint: "Available to book" },
    { label: "Customers", value: data.clients, icon: Users, bg: "bg-[#fceefa]", color: "text-[#bc78b1]", hint: "Unique contacts" },
  ];
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(stat =>
    <div key={stat.label} className="surface p-5">
      <div className="flex items-start justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.bg} ${stat.color}`}><stat.icon size={20}/></div>
        <span className="rounded-full bg-[#f6f7fb] px-2 py-1 text-[10px] font-bold text-[#9ba5b6]">Overview</span>
      </div>
      <div className="mt-5 text-[28px] font-extrabold tracking-tight">{String(stat.value).padStart(2, "0")}</div>
      <div className="mt-1 text-[13px] font-bold">{stat.label}</div>
      <div className="mt-1 text-[11px] text-[#a0a9b8]">{stat.hint}</div>
    </div>)}</div>;
}
