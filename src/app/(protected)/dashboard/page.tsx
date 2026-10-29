import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Plus, TrendingUp, Users, WandSparkles } from "lucide-react";
import { prisma } from "@/lib/db";
import { getActor } from "@/lib/permissions";
import { formatMoney } from "@/lib/booking";
import { StatusPill } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [bookings, upcoming, activeServices, clients, actor] = await Promise.all([
    prisma.booking.findMany({ include: { service: true, customer: true }, orderBy: { createdAt: "desc" } }),
    prisma.booking.count({ where: { status: "CONFIRMED", date: { gte: new Date().toISOString().slice(0, 10) } } }),
    prisma.service.count({ where: { active: true } }),
    prisma.customer.count(),
    getActor(),
  ]);
  const revenue = bookings.filter((booking) => booking.status === "COMPLETED").reduce((sum, booking) => sum + booking.service.price, 0);
  const stats = [
    { label: "Total bookings", value: String(bookings.length).padStart(2, "0"), icon: CalendarDays, bg: "bg-[#eeedff]", color: "text-[#7772ed]", hint: "All time" },
    { label: "Upcoming", value: String(upcoming).padStart(2, "0"), icon: Clock3, bg: "bg-[#e8f6f2]", color: "text-[#36a887]", hint: "Confirmed appointments" },
    { label: "Active services", value: String(activeServices).padStart(2, "0"), icon: CheckCircle2, bg: "bg-[#fff4e8]", color: "text-[#d69a4c]", hint: "Available to book" },
    { label: "Customers", value: String(clients).padStart(2, "0"), icon: Users, bg: "bg-[#fceefa]", color: "text-[#bc78b1]", hint: "Unique contacts" },
  ];
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - 6 + index);
    const date = day.toISOString().slice(0, 10);
    return { label: day.toLocaleDateString("en-US", { weekday: "short" }), count: bookings.filter((booking) => booking.date === date).length };
  });
  const max = Math.max(1, ...days.map((day) => day.count));
  const todayLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  return <div className="space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="mb-1 text-[12px] font-semibold text-[#8d98ae]">{todayLabel}</div><h1 className="section-title">Good to see you, {actor?.name.split(" ")[0] || "there"} <span aria-hidden="true">👋</span></h1><p className="mt-2 text-[13px] text-[#8e99ae]">Here is what is happening in your booking workspace.</p></div><Link href="/bookings/new" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#6965e8] px-4 text-[13px] font-bold text-white shadow-[0_6px_18px_#6965e833] hover:bg-[#5753d7]"><Plus size={16}/> New booking</Link></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <div key={stat.label} className="surface p-5"><div className="flex items-start justify-between"><div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.bg} ${stat.color}`}><stat.icon size={20}/></div><span className="rounded-full bg-[#f6f7fb] px-2 py-1 text-[10px] font-bold text-[#9ba5b6]">Overview</span></div><div className="mt-5 text-[28px] font-extrabold tracking-tight">{stat.value}</div><div className="mt-1 text-[13px] font-bold">{stat.label}</div><div className="mt-1 text-[11px] text-[#a0a9b8]">{stat.hint}</div></div>)}</div>
    <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
      <div className="surface p-6"><div className="flex items-start justify-between"><div><h2 className="text-[16px] font-extrabold">Booking activity</h2><p className="mt-1 text-xs text-[#9da7b8]">Appointments scheduled over the last seven days</p></div><span className="flex items-center gap-1 rounded-full bg-[#edf8f3] px-3 py-1.5 text-[11px] font-bold text-[#399d72]"><TrendingUp size={13}/> Live data</span></div>
        <div className="mt-8 flex h-56 items-end justify-around gap-3 border-b border-[#e7eaf0] pb-0">{days.map((day, index) => <div key={index} className="flex h-full w-full max-w-12 flex-col items-center justify-end gap-2"><span className="text-[10px] font-bold text-[#8d99af]">{day.count}</span><div className={`w-full rounded-t-lg ${index === 6 ? "bg-[#7972ed]" : "bg-[#dcdbfb]"}`} style={{ height: `${Math.max(4, (day.count / max) * 88)}%` }}/></div>)}</div>
        <div className="mt-3 flex justify-around">{days.map((day, index) => <span key={index} className="w-full text-center text-[11px] font-semibold text-[#9ba5b6]">{day.label}</span>)}</div>
      </div>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#6f67e5] to-[#4c63cb] p-7 text-white shadow-[0_15px_30px_#6d66df24]"><div className="absolute -right-12 -top-8 h-40 w-40 rounded-full border-[24px] border-white/10"/><div className="absolute -bottom-20 -right-12 h-52 w-52 rounded-full border-[30px] border-white/10"/><div className="relative"><div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><WandSparkles size={24}/></div><p className="mt-9 text-[12px] font-bold text-[#cccaff]">Business snapshot</p><h2 className="mt-2 text-3xl font-extrabold tracking-tight">{formatMoney(revenue)}</h2><p className="mt-2 text-xs text-[#dddafe]">Value of completed bookings</p><div className="mt-8 h-px bg-white/20"/><p className="mt-5 text-[13px] font-medium leading-6 text-[#e8e6ff]">Keep your schedule full and your customers happy. Every appointment matters.</p><Link href="/bookings" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-white">Explore bookings <ArrowRight size={15}/></Link></div></div>
    </div>
    <div className="surface overflow-hidden"><div className="flex items-center justify-between px-6 py-5"><div><h2 className="text-[16px] font-extrabold">Recent bookings</h2><p className="mt-1 text-xs text-[#9ca6b9]">Your latest appointment activity</p></div><Link href="/bookings" className="flex items-center gap-1.5 text-xs font-bold text-[#6e69e4]">View all <ArrowRight size={15}/></Link></div><div className="overflow-x-auto"><table className="w-full text-left text-[13px]"><thead className="table-head bg-[#fafbfe]"><tr><th className="px-6 py-3">Customer</th><th className="px-4 py-3">Service</th><th className="px-4 py-3">Date & time</th><th className="px-4 py-3">Status</th><th className="px-6 py-3 text-right">Amount</th></tr></thead><tbody>{bookings.slice(0, 5).map((booking) => <tr key={booking.id} className="table-row"><td className="px-6 py-4"><div className="font-bold">{booking.customer.name}</div><div className="mt-0.5 text-[11px] text-[#a0aabd]">{booking.reference}</div></td><td className="px-4 py-4 text-[#66718b]">{booking.service.name}</td><td className="px-4 py-4 text-[#66718b]">{booking.date} · {booking.timeSlot}</td><td className="px-4 py-4"><StatusPill status={booking.status}/></td><td className="px-6 py-4 text-right font-bold">{formatMoney(booking.service.price)}</td></tr>)}</tbody></table>{bookings.length === 0 && <div className="p-12 text-center text-sm text-[#98a3b4]">No bookings yet. Create your first appointment.</div>}</div></div>
  </div>;
}
