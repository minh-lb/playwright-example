import { Plus } from "lucide-react";
import { Button } from "../ui";

export function ServicesHeader({ onAdd }: { onAdd: () => void }) {
  return <div className="flex flex-wrap items-end justify-between gap-4">
    <div><p className="mb-1 text-xs font-semibold text-[#929db0]">Manage your offerings</p>
      <h1 className="section-title">Services</h1>
      <p className="mt-2 text-[13px] text-[#929db0]">Create and manage the experiences your customers can book.</p></div>
    <Button onClick={onAdd}><Plus size={16}/> Add service</Button>
  </div>;
}
