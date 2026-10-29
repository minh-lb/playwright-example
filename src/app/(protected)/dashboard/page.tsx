import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Plus, Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { getActor } from "@/lib/permissions";
import { formatMoney } from "@/lib/booking";
import { StatusPill } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [bookings, upcoming, activeServices, clients, actor] = await Promise.all([
    prisma.booking.findMany({ include: { service: true, customer: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }),
    prisma.booking.count({ where: { status: "CONFIRMED", date: { gte: new Date().toISOString().slice(0, 10) } } }),
    prisma.service.count({ where: { active: true } }),
    prisma.customer.count(),
    getActor(),
  ]);
  const stats = [
    { label: "Total bookings", value: String(bookings.length).padStart(2, "0"), icon: CalendarDays, bg: "bg-[#eeedff]", color: "text-[#7772ed]", hint: "All time" },
    { label: "Upcoming", value: String(upcoming).padStart(2, "0"), icon: Clock3, bg: "bg-[#e8f6f2]", color: "text-[#36a887]", hint: "Confirmed appointments" },
    { label: "Active services", value: String(activeServices).padStart(2, "0"), icon: CheckCircle2, bg: "bg-[#fff4e8]", color: "text-[#d69a4c]", hint: "Available to book" },
    { label: "Customers", value: String(clients).padStart(2, "0"), icon: Users, bg: "bg-[#fceefa]", color: "text-[#bc78b1]", hint: "Unique contacts" },
  ];
  const completedRevenue = bookings
    .filter((booking) => booking.status === "COMPLETED")
    .reduce((total, booking) => total + booking.service.price, 0);
  const todayLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  return <div className="space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="mb-1 text-[12px] font-semibold text-[#8d98ae]">{todayLabel}</div><h1 className="section-title">Good to see you, {actor?.name.split(" ")[0] || "there"} <span aria-hidden="true">👋</span></h1><p className="mt-2 text-[13px] text-[#8e99ae]">Here is what is happening in your booking workspace.</p></div><Link href="/bookings/new" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#6965e8] px-4 text-[13px] font-bold text-white shadow-[0_6px_18px_#6965e833] hover:bg-[#5753d7]"><Plus size={16}/> New booking</Link></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <div key={stat.label} className="surface p-5"><div className="flex items-start justify-between"><div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.bg} ${stat.color}`}><stat.icon size={20}/></div><span className="rounded-full bg-[#f6f7fb] px-2 py-1 text-[10px] font-bold text-[#9ba5b6]">Overview</span></div><div className="mt-5 text-[28px] font-extrabold tracking-tight">{stat.value}</div><div className="mt-1 text-[13px] font-bold">{stat.label}</div><div className="mt-1 text-[11px] text-[#a0a9b8]">{stat.hint}</div></div>)}</div>
    <section className="surface p-6" aria-labelledby="business-snapshot-title"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="business-snapshot-title" className="text-[16px] font-extrabold">Business snapshot</h2><p className="text-[28px] font-extrabold tracking-tight">{formatMoney(completedRevenue)}</p></div><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[#9ca6b9]">Revenue from completed bookings</p><Link href="/bookings" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6e69e4]">Explore bookings <ArrowRight size={15}/></Link></div></section>
    <div className="surface overflow-hidden"><div className="flex items-center justify-between px-6 py-5"><div><h2 className="text-[16px] font-extrabold">Recent bookings</h2><p className="mt-1 text-xs text-[#9ca6b9]">Your latest appointment activity</p></div><Link href="/bookings" className="flex items-center gap-1.5 text-xs font-bold text-[#6e69e4]">View all <ArrowRight size={15}/></Link></div><div className="overflow-x-auto"><table className="w-full text-left text-[13px]"><thead className="table-head bg-[#fafbfe]"><tr><th className="px-6 py-3">Customer</th><th className="px-4 py-3">Service</th><th className="px-4 py-3">Date & time</th><th className="px-4 py-3">Status</th><th className="px-6 py-3 text-right">Amount</th></tr></thead><tbody>{bookings.slice(0, 5).map((booking) => <tr key={booking.id} className="table-row"><td className="px-6 py-4"><div className="font-bold">{booking.customer.name}</div><div className="mt-0.5 text-[11px] text-[#a0aabd]">{booking.reference}</div></td><td className="px-4 py-4 text-[#66718b]">{booking.service.name}</td><td className="px-4 py-4 text-[#66718b]">{booking.date} · {booking.timeSlot}</td><td className="px-4 py-4"><StatusPill status={booking.status}/></td><td className="px-6 py-4 text-right font-bold">{formatMoney(booking.service.price)}</td></tr>)}</tbody></table>{bookings.length === 0 && <div className="p-12 text-center text-sm text-[#98a3b4]">No bookings yet. Create your first appointment.</div>}</div></div>
  </div>;
}
