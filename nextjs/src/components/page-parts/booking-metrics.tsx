import { CalendarDays, CheckCircle2, Clock3 } from "lucide-react";

export function BookingMetrics({ total, confirmed, completed }: { total: number; confirmed: number; completed: number }) {
  const stats = [
    { label: "Matching bookings", value: total, Icon: CalendarDays, bg: "bg-[#eeedff]", color: "text-[#746fec]" },
    { label: "Confirmed on page", value: confirmed, Icon: Clock3, bg: "bg-[#e9f6f1]", color: "text-[#43a784]" },
    { label: "Completed on page", value: completed, Icon: CheckCircle2, bg: "bg-[#f0efff]", color: "text-[#7773d9]" },
  ];
  return <div className="grid gap-4 sm:grid-cols-3">{stats.map(({ label, value, Icon, bg, color }) =>
    <div key={label} className="surface flex items-center gap-4 p-5">
      <div className={`rounded-xl p-3 ${bg} ${color}`}><Icon size={21}/></div>
      <div><div className="text-[11px] font-semibold text-[#9aa5b6]">{label}</div><div className="mt-1 text-2xl font-extrabold">{value}</div></div>
    </div>
  )}</div>;
}
