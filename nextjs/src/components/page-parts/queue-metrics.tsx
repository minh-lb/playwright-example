export type QueueStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
export function QueueMetrics({ counts }: { counts: Record<QueueStatus, number> }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {(["PENDING", "PROCESSING", "COMPLETED", "FAILED"] as const).map(status =>
      <div key={status} className="surface p-5">
        <div className="text-[11px] font-semibold text-[#9aa5b6]">{status.toLowerCase()}</div>
        <div className="mt-2 text-2xl font-extrabold">{counts[status]}</div>
      </div>
    )}
  </div>;
}
