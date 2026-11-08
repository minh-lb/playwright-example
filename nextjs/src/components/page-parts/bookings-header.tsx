import Link from "next/link";
import { Plus } from "lucide-react";

export function BookingsHeader() {
  return <div className="flex flex-wrap items-end justify-between gap-4">
    <div><p className="mb-1 text-xs font-semibold text-[#929db0]">Appointment management</p>
      <h1 className="section-title">Bookings</h1>
      <p className="mt-2 text-[13px] text-[#929db0]">All your appointments in one organized place.</p>
    </div>
    <Link href="/bookings/new" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#6965e8] px-4 text-[13px] font-bold text-white shadow-[0_6px_18px_#6965e833]"><Plus size={16}/> New booking</Link>
  </div>;
}
