export function ServiceMetrics({ total, visible, active }: { total: number; visible: number; active: number }) {
  return <div className="grid gap-4 sm:grid-cols-3">
    {[
      { label: "Total services", value: total },
      { label: "On this page", value: visible },
      { label: "Available on this page", value: active },
    ].map(({ label, value }) => <div className="surface p-5" key={label}>
      <div className="text-xs font-semibold text-[#9aa5b6]">{label}</div>
      <div className="mt-2 text-2xl font-extrabold">{value}</div>
    </div>)}
  </div>;
}
