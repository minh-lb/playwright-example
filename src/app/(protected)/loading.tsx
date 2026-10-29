export default function Loading() {
  return <div className="animate-pulse space-y-6"><div className="h-9 w-60 rounded-xl bg-[#e5e9f4]"/><div className="grid gap-5 md:grid-cols-3">{[1, 2, 3].map((i) => <div key={i} className="h-36 rounded-2xl bg-[#e8edf6]"/>)}</div><div className="h-80 rounded-2xl bg-[#e8edf6]"/></div>;
}
