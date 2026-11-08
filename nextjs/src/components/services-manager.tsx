"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Archive, Clock3, Edit3, Plus, Search, SlidersHorizontal } from "lucide-react";
import { Button, EmptyState, Modal, Spinner, StatusPill, Toast } from "./ui";
import { formatMoney } from "@/lib/booking";
import { serviceSchema } from "@/lib/services";

type ServiceItem = {
  id: number; name: string; description: string; category: string; durationMinutes: number; price: number; color: string; active: boolean;
  _count: { bookings: number };
};
type PageData = { items: ServiceItem[]; total: number; page: number; pageSize: number };
type Draft = { name: string; description: string; category: "Consultation" | "Wellness" | "Coaching"; durationMinutes: number; price: number; color: "indigo" | "rose" | "amber" | "cyan" | "emerald" | "violet"; active: boolean };

const emptyDraft: Draft = { name: "", description: "", category: "Consultation", durationMinutes: 60, price: 250000, color: "indigo", active: true };

function ServiceForm({ service, onClose, onSaved }: { service?: ServiceItem; onClose: () => void; onSaved: (message: string) => void }) {
  const [form, setForm] = useState<Draft>(service ? {
    name: service.name, description: service.description, category: service.category as Draft["category"], durationMinutes: service.durationMinutes,
    price: service.price, color: service.color as Draft["color"], active: service.active,
  } : emptyDraft);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  function change<K extends keyof Draft>(field: K, value: Draft[K]) { setForm((current) => ({ ...current, [field]: value })); }
  async function save(event: FormEvent) {
    event.preventDefault();
    const parsed = serviceSchema.safeParse(form);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || "Please check the fields"); return; }
    setSaving(true); setError("");
    try {
      const response = await fetch(service ? `/api/services/${service.id}` : "/api/services", {
        method: service ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Save failed");
      onSaved(service ? "Service updated" : "New service added");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Save failed"); }
    finally { setSaving(false); }
  }
  return <form className="space-y-4" onSubmit={save} noValidate>
    <div><label className="field-label" htmlFor="service-name">Service name</label><input id="service-name" className="field" value={form.name} onChange={(event) => change("name", event.target.value)} placeholder="e.g. Strategy consultation"/></div>
    <div><label className="field-label" htmlFor="service-description">Description</label><textarea id="service-description" className="field" value={form.description} onChange={(event) => change("description", event.target.value)} placeholder="What does this service include?"/></div>
    <div className="grid grid-cols-2 gap-4"><div><label className="field-label" htmlFor="service-category">Category</label><select id="service-category" className="field" value={form.category} onChange={(event) => change("category", event.target.value as Draft["category"])}>{["Consultation", "Wellness", "Coaching"].map((category) => <option key={category}>{category}</option>)}</select></div><div><label className="field-label" htmlFor="service-duration">Duration</label><select id="service-duration" className="field" value={form.durationMinutes} onChange={(event) => change("durationMinutes", Number(event.target.value))}>{[30, 45, 60, 90, 120].map((duration) => <option key={duration} value={duration}>{duration} minutes</option>)}</select></div></div>
    <div className="grid grid-cols-2 gap-4"><div><label className="field-label" htmlFor="service-price">Price (VND)</label><input id="service-price" className="field" type="number" min={1} value={form.price} onChange={(event) => change("price", Number(event.target.value))}/></div><div><label className="field-label" htmlFor="service-color">Accent color</label><select id="service-color" className="field capitalize" value={form.color} onChange={(event) => change("color", event.target.value as Draft["color"])}>{["indigo", "rose", "amber", "cyan", "emerald", "violet"].map((color) => <option key={color} value={color}>{color}</option>)}</select></div></div>
    <label className="flex items-center gap-2.5 text-sm font-medium text-[#53617a]"><input type="checkbox" checked={form.active} onChange={(event) => change("active", event.target.checked)} className="accent-[#6f6ae7]"/> Active and available to book</label>
    {error && <p role="alert" className="rounded-lg bg-[#fff0f1] px-3 py-2 text-xs font-semibold text-[#c75660]">{error}</p>}
    <div className="flex justify-end gap-2 border-t border-[#edf0f5] pt-5"><Button variant="secondary" type="button" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save service"}</Button></div>
  </form>;
}

const colorStyles: Record<string, string> = { indigo: "bg-[#eeeefe] text-[#7773da]", rose: "bg-[#ffedf1] text-[#cb7790]", amber: "bg-[#fff3e5] text-[#d69c59]", cyan: "bg-[#e8f7fb] text-[#52a6bc]", emerald: "bg-[#e8f8f0] text-[#51ae8a]", violet: "bg-[#f4ecff] text-[#a076cf]" };

export function ServicesManager() {
  const [data, setData] = useState<PageData>({ items: [], total: 0, page: 1, pageSize: 6 });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<ServiceItem | "new" | null>(null);
  const [archive, setArchive] = useState<ServiceItem | null>(null);
  const [toast, setToast] = useState<{ message: string; kind: "success" | "error" } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    const query = new URLSearchParams({ page: String(page), search, category });
    fetch(`/api/services?${query.toString()}`, { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("Could not load services");
      return response.json() as Promise<PageData>;
    }).then(setData).catch((caught) => { if (!controller.signal.aborted) setError(caught.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [search, category, page, revision]);

  function saved(message: string) { setEditing(null); setRevision((v) => v + 1); setToast({ message, kind: "success" }); }
  async function archiveService() {
    if (!archive) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/services/${archive.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not archive service");
      setArchive(null); setRevision((v) => v + 1); setToast({ message: "Service archived", kind: "success" });
    } catch (caught) { setToast({ message: caught instanceof Error ? caught.message : "Archive failed", kind: "error" }); }
    finally { setSaving(false); }
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 text-xs font-semibold text-[#929db0]">Manage your offerings</p><h1 className="section-title">Services</h1><p className="mt-2 text-[13px] text-[#929db0]">Create and manage the experiences your customers can book.</p></div><Button onClick={() => setEditing("new")}><Plus size={16}/> Add service</Button></div>
    <div className="grid gap-4 sm:grid-cols-3"><div className="surface p-5"><div className="text-xs font-semibold text-[#9aa5b6]">Total services</div><div className="mt-2 text-2xl font-extrabold">{data.total}</div></div><div className="surface p-5"><div className="text-xs font-semibold text-[#9aa5b6]">On this page</div><div className="mt-2 text-2xl font-extrabold">{data.items.length}</div></div><div className="surface p-5"><div className="text-xs font-semibold text-[#9aa5b6]">Available on this page</div><div className="mt-2 text-2xl font-extrabold">{data.items.filter((item) => item.active).length}</div></div></div>
    <div className="surface overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ecf0f5] px-5 py-5"><div className="relative w-full max-w-[330px]"><Search size={16} className="absolute left-3.5 top-3.5 text-[#a0aabe]"/><input className="field pl-10" placeholder="Search services..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }}/></div><div className="flex items-center gap-2"><SlidersHorizontal size={15} className="text-[#9aa5b6]"/><select aria-label="Filter services by category" className="field min-w-[155px]" value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}>{["All", "Consultation", "Wellness", "Coaching"].map((item) => <option key={item}>{item}</option>)}</select></div></div>
      {loading ? <Spinner label="Loading services..."/> : error ? <EmptyState title="Could not load services" description={error}/> : data.items.length === 0 ? <EmptyState title="No services found" description="Try another search or create a new service."/> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-[13px]"><thead className="table-head bg-[#fafbfe]"><tr><th className="px-6 py-3">Service</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Duration</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Status</th><th className="px-6 py-3 text-right">Actions</th></tr></thead><tbody>{data.items.map((item) => <tr key={item.id} className="table-row"><td className="px-6 py-4"><div className="flex items-center gap-3"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorStyles[item.color] || colorStyles.indigo}`}><Clock3 size={19}/></div><div><div className="font-bold">{item.name}</div><div className="mt-0.5 max-w-60 truncate text-[11px] text-[#a0aabd]">{item.description}</div></div></div></td><td className="px-4 py-4 text-[#68758f]">{item.category}</td><td className="px-4 py-4 text-[#68758f]">{item.durationMinutes} min</td><td className="px-4 py-4 font-semibold">{formatMoney(item.price)}</td><td className="px-4 py-4"><StatusPill status={item.active ? "Active" : "Archived"}/></td><td className="px-6 py-4"><div className="flex justify-end gap-1"><button aria-label={`Edit ${item.name}`} title="Edit" onClick={() => setEditing(item)} className="rounded-lg p-2 text-[#8a95a9] hover:bg-[#eff0ff] hover:text-[#6c67dd]"><Edit3 size={16}/></button><button aria-label={`Archive ${item.name.toLowerCase()}`} title="Archive" disabled={!item.active} onClick={() => setArchive(item)} className="rounded-lg p-2 text-[#8a95a9] hover:bg-[#fff0f2] hover:text-[#ca687b] disabled:opacity-30"><Archive size={16}/></button></div></td></tr>)}</tbody></table></div>}
      <div className="flex items-center justify-between border-t border-[#eef1f5] px-6 py-4 text-xs text-[#8b97aa]"><span>Showing {data.items.length ? (page - 1) * data.pageSize + 1 : 0}–{Math.min(page * data.pageSize, data.total)} of {data.total}</span><div className="flex gap-2"><Button variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>Previous</Button><Button variant="secondary" disabled={page * data.pageSize >= data.total || loading} onClick={() => setPage((p) => p + 1)}>Next</Button></div></div>
    </div>
    {editing && <Modal title={editing === "new" ? "Add new service" : "Edit service"} onClose={() => setEditing(null)}><ServiceForm service={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} onSaved={saved}/></Modal>}
    {archive && <Modal title="Archive service" onClose={() => setArchive(null)}><p className="text-sm leading-6 text-[#62708a]">Archive <strong>{archive.name}</strong>? It will no longer appear when creating a booking. Existing appointments are kept.</p><div className="mt-6 flex justify-end gap-2"><Button variant="secondary" onClick={() => setArchive(null)}>Keep service</Button><Button variant="danger" disabled={saving} onClick={archiveService}>Confirm archive</Button></div></Modal>}
    {toast && <Toast {...toast} onClose={() => setToast(null)}/>}
  </div>;
}
