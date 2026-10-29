"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock3, Eye, Plus, Search, SlidersHorizontal, SortDesc, UserRound, XCircle } from "lucide-react";
import { Button, EmptyState, Modal, Spinner, StatusPill, Toast } from "./ui";
import { formatMoney } from "@/lib/booking";

type BookingItem = {
  id: number; reference: string; date: string; timeSlot: string; status: "CONFIRMED" | "COMPLETED" | "CANCELED"; notes: string;
  customer: { name: string; email: string; phone: string };
  service: { name: string; durationMinutes: number; price: number; category: string };
};
type PageData = { items: BookingItem[]; total: number; pageSize: number; page: number };

export function BookingsManager() {
  const [data, setData] = useState<PageData>({ items: [], total: 0, pageSize: 8, page: 1 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<BookingItem | null>(null);
  const [confirmAction, setConfirmAction] = useState<"COMPLETED" | "CANCELED" | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; kind: "success" | "error" } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    const query = new URLSearchParams({ page: String(page), search, status, sort });
    fetch(`/api/bookings?${query.toString()}`, { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("Could not load bookings");
      return response.json() as Promise<PageData>;
    }).then(setData).catch((caught) => { if (!controller.signal.aborted) setError(caught.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [search, status, sort, page, revision]);

  async function updateStatus() {
    if (!selected || !confirmAction) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/bookings/${selected.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: confirmAction }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Update failed");
      setConfirmAction(null); setSelected(null); setRevision((v) => v + 1);
      setToast({ message: confirmAction === "CANCELED" ? "Booking canceled" : "Booking marked completed", kind: "success" });
    } catch (caught) { setToast({ message: caught instanceof Error ? caught.message : "Update failed", kind: "error" }); }
    finally { setSaving(false); }
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 text-xs font-semibold text-[#929db0]">Appointment management</p><h1 className="section-title">Bookings</h1><p className="mt-2 text-[13px] text-[#929db0]">All your appointments in one organized place.</p></div><Link href="/bookings/new" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#6965e8] px-4 text-[13px] font-bold text-white shadow-[0_6px_18px_#6965e833]"><Plus size={16}/> New booking</Link></div>
    <div className="grid gap-4 sm:grid-cols-3"><div className="surface flex items-center gap-4 p-5"><div className="rounded-xl bg-[#eeedff] p-3 text-[#746fec]"><CalendarDays size={21}/></div><div><div className="text-[11px] font-semibold text-[#9aa5b6]">Matching bookings</div><div className="mt-1 text-2xl font-extrabold">{data.total}</div></div></div><div className="surface flex items-center gap-4 p-5"><div className="rounded-xl bg-[#e9f6f1] p-3 text-[#43a784]"><Clock3 size={21}/></div><div><div className="text-[11px] font-semibold text-[#9aa5b6]">Confirmed on page</div><div className="mt-1 text-2xl font-extrabold">{data.items.filter((item) => item.status === "CONFIRMED").length}</div></div></div><div className="surface flex items-center gap-4 p-5"><div className="rounded-xl bg-[#f0efff] p-3 text-[#7773d9]"><CheckCircle2 size={21}/></div><div><div className="text-[11px] font-semibold text-[#9aa5b6]">Completed on page</div><div className="mt-1 text-2xl font-extrabold">{data.items.filter((item) => item.status === "COMPLETED").length}</div></div></div></div>
    <div className="surface overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ecf0f5] px-5 py-5"><div className="relative w-full max-w-[310px]"><Search className="absolute left-3.5 top-3.5 text-[#a0aabe]" size={16}/><input className="field pl-10" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search bookings..."/></div><div className="flex flex-wrap items-center gap-2"><SlidersHorizontal size={15} className="text-[#9ba5b6]"/><select aria-label="Filter by status" className="field min-w-[140px]" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="All">All statuses</option><option value="CONFIRMED">Confirmed</option><option value="COMPLETED">Completed</option><option value="CANCELED">Canceled</option></select><SortDesc size={16} className="ml-2 text-[#9ba5b6]"/><select aria-label="Sort bookings" className="field min-w-[130px]" value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></div></div>
      {loading ? <Spinner label="Loading bookings..."/> : error ? <EmptyState title="Could not load bookings" description={error}/> : data.items.length === 0 ? <EmptyState title="No bookings found" description="Try a different filter or create a booking."/> : <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-[13px]"><thead className="table-head bg-[#fafbfe]"><tr><th className="px-6 py-3">Booking</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Service</th><th className="px-4 py-3">Date & time</th><th className="px-4 py-3">Status</th><th className="px-6 py-3 text-right">Actions</th></tr></thead><tbody>{data.items.map((booking) => <tr key={booking.id} className="table-row"><td className="px-6 py-4 font-bold text-[#6965d8]">{booking.reference}</td><td className="px-4 py-4"><div className="font-bold">{booking.customer.name}</div><div className="mt-1 text-[11px] text-[#a0aabd]">{booking.customer.email}</div></td><td className="px-4 py-4 text-[#67748c]">{booking.service.name}</td><td className="px-4 py-4"><div className="font-semibold">{booking.date}</div><div className="mt-1 text-[11px] text-[#a0aabd]">{booking.timeSlot}</div></td><td className="px-4 py-4"><StatusPill status={booking.status}/></td><td className="px-6 py-4 text-right"><button aria-label={`View ${booking.reference}`} onClick={() => setSelected(booking)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-[#6e6adf] hover:bg-[#f1f0ff]"><Eye size={15}/> View</button></td></tr>)}</tbody></table></div>}
      <div className="flex items-center justify-between border-t border-[#eef1f5] px-6 py-4 text-xs text-[#8b97aa]"><span>Showing {data.items.length ? (page - 1) * data.pageSize + 1 : 0}–{Math.min(page * data.pageSize, data.total)} of {data.total}</span><div className="flex gap-2"><Button variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>Previous</Button><Button variant="secondary" disabled={page * data.pageSize >= data.total || loading} onClick={() => setPage((p) => p + 1)}>Next</Button></div></div>
    </div>
    {selected && !confirmAction && <Modal title={`Booking ${selected.reference}`} onClose={() => setSelected(null)}><div className="space-y-5"><div className="flex items-center justify-between rounded-xl bg-[#f8f9fd] p-4"><span className="text-xs font-semibold text-[#8b96ac]">Current status</span><StatusPill status={selected.status}/></div><div className="flex gap-3"><div className="rounded-xl bg-[#eeedff] p-3 text-[#7771ed]"><UserRound size={22}/></div><div><div className="font-bold">{selected.customer.name}</div><div className="mt-1 text-xs text-[#94a0b4]">{selected.customer.email}</div><div className="mt-1 text-xs text-[#94a0b4]">{selected.customer.phone}</div></div></div><div className="grid grid-cols-2 gap-5 border-t border-[#eef1f5] pt-5 text-sm"><div><p className="mb-1 text-xs text-[#98a3b5]">Service</p><p className="font-bold">{selected.service.name}</p></div><div><p className="mb-1 text-xs text-[#98a3b5]">Price</p><p className="font-bold">{formatMoney(selected.service.price)}</p></div><div><p className="mb-1 text-xs text-[#98a3b5]">Date</p><p className="font-bold">{selected.date}</p></div><div><p className="mb-1 text-xs text-[#98a3b5]">Time</p><p className="font-bold">{selected.timeSlot}</p></div></div>{selected.notes && <div className="rounded-xl bg-[#f8f9fd] p-4 text-sm text-[#62708a]"><span className="text-xs font-bold text-[#9ca7ba]">Notes</span><p className="mt-1">{selected.notes}</p></div>}<div className="flex justify-end gap-2 border-t border-[#eef1f5] pt-5">{selected.status === "CONFIRMED" && <><Button variant="danger" onClick={() => setConfirmAction("CANCELED")}><XCircle size={15}/> Cancel booking</Button><Button onClick={() => setConfirmAction("COMPLETED")}><CheckCircle2 size={15}/> Mark completed</Button></>}<Button variant="secondary" onClick={() => setSelected(null)}>Close</Button></div></div></Modal>}
    {selected && confirmAction && <Modal title={confirmAction === "CANCELED" ? "Cancel booking" : "Complete booking"} onClose={() => setConfirmAction(null)}><p className="text-sm leading-6 text-[#65728a]">Are you sure you want to {confirmAction === "CANCELED" ? "cancel" : "complete"} the appointment for <strong>{selected.customer.name}</strong>? {confirmAction === "CANCELED" && "The time slot will become available again."}</p><div className="mt-6 flex justify-end gap-2"><Button variant="secondary" onClick={() => setConfirmAction(null)}>Go back</Button><Button variant={confirmAction === "CANCELED" ? "danger" : "primary"} disabled={saving} onClick={updateStatus}>{saving ? "Saving..." : confirmAction === "CANCELED" ? "Confirm cancellation" : "Confirm completion"}</Button></div></Modal>}
    {toast && <Toast {...toast} onClose={() => setToast(null)}/>}
  </div>;
}
