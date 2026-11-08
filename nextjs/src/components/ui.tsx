"use client";

import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, X } from "lucide-react";
import clsx from "clsx";

export function Button({ className, variant = "primary", children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const styles = {
    primary: "bg-[#6965e8] text-white hover:bg-[#5753d7] shadow-[0_5px_12px_#6965e829]",
    secondary: "border border-[#dce3ef] bg-white text-[#34405e] hover:bg-[#f7f9ff]",
    danger: "bg-[#fef0f0] text-[#ca4b53] hover:bg-[#ffe5e7]",
    ghost: "text-[#75819b] hover:bg-[#f2f4fa] hover:text-[#34405e]",
  };
  return <button {...props} className={clsx("inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[10px] px-4 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50", styles[variant], className)}>{children}</button>;
}

export function StatusPill({ status }: { status: string }) {
  const variants: Record<string, string> = {
    PENDING: "bg-[#fff6e9] text-[#b47c20] before:bg-[#dcaa49]",
    PROCESSING: "bg-[#eaf1ff] text-[#597fca] before:bg-[#7196e7]",
    FAILED: "bg-[#f9edf0] text-[#c46c80] before:bg-[#db8092]",
    CONFIRMED: "bg-[#eaf5ef] text-[#269467] before:bg-[#29ae73]",
    COMPLETED: "bg-[#edf0fc] text-[#6569b2] before:bg-[#7b82dc]",
    CANCELED: "bg-[#f9edf0] text-[#c46c80] before:bg-[#db8092]",
    Active: "bg-[#eaf5ef] text-[#269467] before:bg-[#29ae73]",
    Archived: "bg-[#f1f2f6] text-[#8791a7] before:bg-[#a9b2c2]",
  };
  return <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize before:h-1.5 before:w-1.5 before:rounded-full", variants[status] || variants.Archived)}>{status.toLowerCase()}</span>;
}

export function Modal({ title, children, onClose, width = "max-w-lg" }: { title: string; children: ReactNode; onClose: () => void; width?: string }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101b32]/50 p-4 backdrop-blur-[3px]" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-label={title} className={clsx("w-full overflow-hidden rounded-2xl bg-white shadow-[0_30px_80px_#0d183c33]", width)}>
      <div className="flex items-center justify-between border-b border-[#eef0f5] px-6 py-5"><h2 className="text-lg font-bold tracking-tight">{title}</h2><button aria-label="Close dialog" onClick={onClose} className="rounded-lg p-1.5 text-[#8693aa] hover:bg-[#f3f5fa]"><X size={18}/></button></div>
      <div className="max-h-[75vh] overflow-y-auto px-6 py-5 soft-scroll">{children}</div>
    </div>
  </div>;
}

export function Toast({ message, kind = "success", onClose }: { message: string; kind?: "success" | "error"; onClose: () => void }) {
  useEffect(() => { const timeout = setTimeout(onClose, 4000); return () => clearTimeout(timeout); }, [onClose]);
  return <div role="status" className="fixed bottom-6 right-6 z-[80] flex max-w-sm items-start gap-3 rounded-xl border border-[#e7ebf2] bg-white px-4 py-3.5 shadow-[0_12px_40px_#14234425]">
    {kind === "success" ? <CheckCircle2 className="mt-0.5 text-emerald-500" size={19}/> : <AlertCircle className="mt-0.5 text-rose-500" size={19}/>}
    <span className="max-w-[280px] text-sm font-medium leading-5">{message}</span>
    <button aria-label="Dismiss notification" onClick={onClose} className="ml-1 text-[#97a3b7]"><X size={16}/></button>
  </div>;
}

export function Spinner({ label = "Loading..." }: { label?: string }) {
  return <div role="status" className="flex min-h-40 items-center justify-center gap-2 text-sm text-[#8693aa]"><LoaderCircle size={20} className="animate-spin text-[#6c68df]"/>{label}</div>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="flex min-h-52 flex-col items-center justify-center gap-2 text-center"><div className="mb-1 rounded-2xl bg-[#f3f2fe] p-4 text-[#807bea]"><AlertCircle size={22}/></div><h3 className="font-bold">{title}</h3><p className="text-sm text-[#96a0b3]">{description}</p></div>;
}
