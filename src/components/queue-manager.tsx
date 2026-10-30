"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, ListTodo, RefreshCw, RotateCcw } from "lucide-react";
import { Button, EmptyState, Spinner, StatusPill, Toast } from "./ui";

type Job = {
  id: number;
  type: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  attempts: number;
  maxAttempts: number;
  booking: { reference: string } | null;
  result: string | null;
  lastError: string | null;
  createdAt: string;
};
type QueueResponse = {
  items: Job[];
  counts: Record<Job["status"], number>;
  page: number;
  totalPages: number;
  total: number;
};
const emptyCounts: QueueResponse["counts"] = { PENDING: 0, PROCESSING: 0, COMPLETED: 0, FAILED: 0 };

export function QueueManager() {
  const [data, setData] = useState<QueueResponse>({ items: [], counts: emptyCounts, page: 1, totalPages: 1, total: 0 });
  const [statusFilter, setStatusFilter] = useState<"ALL" | Job["status"]>("ALL");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scenario, setScenario] = useState<"success" | "retry" | "fail">("success");
  const [busy, setBusy] = useState(false);
  const [retrying, setRetrying] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; kind: "success" | "error" } | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(`/api/queue?status=${statusFilter}&page=${page}`, { cache: "no-store", signal });
      if (!response.ok) throw new Error("Could not load job queue");
      const next = await response.json() as QueueResponse;
      if (!signal?.aborted) {
        setData(next);
        if (next.page !== page) setPage(next.page);
        setError("");
      }
    } catch (caught) {
      if (!signal?.aborted) setError(caught instanceof Error ? caught.message : "Could not load job queue");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    const interval = setInterval(() => void refresh(controller.signal), 1200);
    return () => { controller.abort(); clearInterval(interval); };
  }, [refresh]);

  async function enqueueDemo() {
    setBusy(true);
    try {
      const response = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
      if (!response.ok) throw new Error((await response.json()).error || "Could not enqueue demo job");
      setToast({ message: "Demo job enqueued", kind: "success" });
      await refresh();
    } catch (caught) {
      setToast({ message: caught instanceof Error ? caught.message : "Could not enqueue demo job", kind: "error" });
    } finally { setBusy(false); }
  }

  async function retryJob(id: number) {
    setRetrying(id);
    try {
      const response = await fetch(`/api/queue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry" }),
      });
      if (!response.ok) throw new Error((await response.json()).error || "Could not retry job");
      setToast({ message: "Job queued for retry", kind: "success" });
      await refresh();
    } catch (caught) {
      setToast({ message: caught instanceof Error ? caught.message : "Could not retry job", kind: "error" });
    } finally { setRetrying(null); }
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-1 text-xs font-semibold text-[#929db0]">Background processing</p>
        <h1 className="section-title">Job Queue</h1>
        <p className="mt-2 text-[13px] text-[#929db0]">Track durable booking confirmations and practice retry scenarios. No real email is sent.</p>
      </div>
      <Button variant="secondary" onClick={() => void refresh()}><RefreshCw size={16}/> Refresh</Button>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {(["PENDING", "PROCESSING", "COMPLETED", "FAILED"] as const).map((status) =>
        <div key={status} className="surface p-5">
          <div className="text-[11px] font-semibold text-[#9aa5b6]">{status.toLowerCase()}</div>
          <div className="mt-2 text-2xl font-extrabold">{data.counts[status]}</div>
        </div>,
      )}
    </div>

    <section className="surface flex flex-wrap items-end gap-3 p-5" aria-label="Demo job controls">
      <div className="min-w-[220px] flex-1">
        <label htmlFor="queue-scenario" className="mb-2 block text-xs font-bold">Demo job scenario</label>
        <select id="queue-scenario" aria-label="Demo job scenario" className="field" value={scenario} onChange={(event) => setScenario(event.target.value as typeof scenario)}>
          <option value="success">Success on first attempt</option>
          <option value="retry">Fail twice, then succeed</option>
          <option value="fail">Fail all three attempts</option>
        </select>
      </div>
      <Button disabled={busy} onClick={() => void enqueueDemo()}><ListTodo size={16}/>{busy ? "Enqueuing..." : "Enqueue demo job"}</Button>
    </section>

    <section className="surface overflow-hidden" aria-label="Queued jobs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef1f5] px-6 py-5">
        <h2 className="text-[16px] font-extrabold">Recent jobs</h2>
        <div className="flex items-center gap-3">
          <label htmlFor="queue-status-filter" className="text-xs font-semibold">Status</label>
          <select
            id="queue-status-filter"
            aria-label="Filter jobs by status"
            className="field"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as typeof statusFilter);
              setPage(1);
              setLoading(true);
            }}
          >
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>
      {loading ? <Spinner label="Loading job queue..."/> : error ? <div role="alert" className="flex items-center gap-2 p-5 text-sm text-rose-600"><AlertCircle size={16}/>{error}</div> : data.items.length === 0
        ? <EmptyState title="No jobs yet" description="Create a booking or enqueue a demo job."/>
        : <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-[13px]">
          <thead className="table-head bg-[#fafbfe]"><tr><th className="px-5 py-3">Job</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Attempts</th><th className="px-4 py-3">Result / error</th><th className="px-5 py-3 text-right">Action</th></tr></thead>
          <tbody>{data.items.map((job) =>
            <tr key={job.id} data-job-id={job.id} className="table-row">
              <td className="px-5 py-4 font-bold text-[#6965d8]">#{job.id}</td>
              <td className="px-4 py-4 text-[#67748c]">{job.type === "DEMO" ? "Demo" : "Booking confirmation"}{job.booking && <div className="text-xs">{job.booking.reference}</div>}</td>
              <td className="px-4 py-4"><StatusPill status={job.status}/></td>
              <td className="px-4 py-4">{job.attempts}/{job.maxAttempts}</td>
              <td className="max-w-[300px] break-words px-4 py-4 text-xs text-[#67748c]">{job.lastError || job.result || "Waiting for worker"}</td>
              <td className="px-5 py-4 text-right">{job.status === "FAILED"
                ? <Button variant="secondary" disabled={retrying === job.id} onClick={() => void retryJob(job.id)} aria-label="Retry job"><RotateCcw size={14}/> Retry</Button>
                : <span className="text-[#a6afc0]">—</span>}</td>
            </tr>,
          )}</tbody>
        </table></div>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eef1f5] px-6 py-4 text-xs text-[#67748c]">
        <span>Page {data.page} of {data.totalPages} · {data.total} jobs</span>
        <div className="flex gap-2">
          <Button variant="secondary" aria-label="Previous page" disabled={page <= 1}
            onClick={() => { setLoading(true); setPage((current) => Math.max(1, current - 1)); }}>Previous</Button>
          <Button variant="secondary" aria-label="Next page" disabled={page >= data.totalPages}
            onClick={() => { setLoading(true); setPage((current) => current + 1); }}>Next</Button>
        </div>
      </div>
    </section>
    {toast && <Toast {...toast} onClose={() => setToast(null)}/>}
  </div>;
}
