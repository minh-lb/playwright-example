import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatMoney } from "@/lib/booking";
import { StatusPill } from "../ui";
export type RecentBooking = {
  id: number; reference: string; date: string; timeSlot: string; status: string;
  customer: { name: string }; service: { name: string; price: number };
};
export function DashboardRecentBookings({ bookings }: { bookings: RecentBooking[] }) {
  return <div className="surface overflow-hidden">
    <div className="flex items-center justify-between px-6 py-5">
      <div><h2 className="text-[16px] font-extrabold">Recent bookings</h2><p className="mt-1 text-xs text-[#9ca6b9]">Your latest appointment activity</p></div>
      <Link href="/bookings" className="flex items-center gap-1.5 text-xs font-bold text-[#6e69e4]">View all <ArrowRight size={15}/></Link>
    </div>
    <div className="overflow-x-auto"><table className="w-full text-left text-[13px]">
      <thead className="table-head bg-[#fafbfe]"><tr>{["Customer", "Service", "Date & time", "Status", "Amount"].map(label => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead>
      <tbody>{bookings.slice(0, 5).map(booking => <tr key={booking.id} className="table-row">
        <td className="px-6 py-4"><div className="font-bold">{booking.customer.name}</div><div className="mt-0.5 text-[11px] text-[#a0aabd]">{booking.reference}</div></td>
        <td className="px-4 py-4 text-[#66718b]">{booking.service.name}</td>
        <td className="px-4 py-4 text-[#66718b]">{booking.date} · {booking.timeSlot}</td>
        <td className="px-4 py-4"><StatusPill status={booking.status}/></td>
        <td className="px-6 py-4 text-right font-bold">{formatMoney(booking.service.price)}</td>
      </tr>)}</tbody>
    </table>
    {bookings.length === 0 && <div className="p-12 text-center text-sm text-[#98a3b4]">No bookings yet. Create your first appointment.</div>}
    </div>
  </div>;
}
