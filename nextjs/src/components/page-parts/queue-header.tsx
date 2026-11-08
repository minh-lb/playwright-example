import { RefreshCw } from "lucide-react";
import { Button } from "../ui";

export function QueueHeader({ onRefresh }: { onRefresh: () => void }) {
  return <div className="flex flex-wrap items-end justify-between gap-4">
    <div>
      <p className="mb-1 text-xs font-semibold text-[#929db0]">Background processing</p>
      <h1 className="section-title">Job Queue</h1>
      <p className="mt-2 text-[13px] text-[#929db0]">Track durable booking confirmations and practice retry scenarios. No real email is sent.</p>
    </div>
    <Button variant="secondary" onClick={onRefresh}><RefreshCw size={16}/> Refresh</Button>
  </div>;
}
