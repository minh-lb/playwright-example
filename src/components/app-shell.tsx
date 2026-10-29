"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { CalendarCheck2, CalendarDays, ChevronDown, LayoutDashboard, LogOut, Menu, Plus, Settings2, Sparkles, X } from "lucide-react";
import clsx from "clsx";
import type { AppRole } from "@/lib/roles";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/bookings/new", label: "New booking", icon: Plus },
  { href: "/services", label: "Services", icon: Settings2, admin: true },
];

export function AppShell({ children, user }: { children: ReactNode; user: { name: string; email: string; role: AppRole } }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const navigation = <>
    <Link href="/dashboard" className="mb-11 flex items-center gap-3 px-4" onClick={() => setMobileOpen(false)}>
      <span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#7771f8] text-white shadow-[0_8px_20px_#7771f850]"><CalendarCheck2 size={22} strokeWidth={2.5}/></span>
      <span className="text-[23px] font-extrabold tracking-[-1px] text-white">bookly<span className="text-[#9694ff]">.</span></span>
    </Link>
    <p className="mb-3 px-5 text-[10px] font-extrabold uppercase tracking-[.17em] text-[#6c7894]">Workspace</p>
    <nav aria-label="Main navigation" className="space-y-1">
      {items.filter((item) => !item.admin || user.role === "admin").map((item) => {
        const Icon = item.icon;
        const active = item.href === "/bookings" ? pathname === "/bookings" : pathname === item.href;
        return <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} aria-current={active ? "page" : undefined} className={clsx("flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] font-semibold transition-colors", active ? "bg-[#313d64] text-white" : "text-[#8d9bb8] hover:bg-[#25314f] hover:text-white")}><Icon size={18}/>{item.label}{active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#aaa6ff]"/>}</Link>;
      })}
    </nav>
    <div className="mt-auto px-1 pt-12">
      <div className="rounded-2xl bg-gradient-to-br from-[#424b88] to-[#323c72] px-4 py-5 text-white">
        <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/15"><Sparkles size={18}/></div>
        <div className="text-[13px] font-bold">Make today count</div>
        <p className="mt-2 text-[11px] leading-relaxed text-[#bbc3ef]">Everything you need to manage a smoother booking day.</p>
        <Link href="/bookings/new" onClick={() => setMobileOpen(false)} className="mt-4 inline-flex items-center gap-1 text-[11px] font-bold text-white">Create booking <span>→</span></Link>
      </div>
    </div>
  </>;
  const initials = user.name.split(" ").filter(Boolean).map((word) => word[0]).slice(0, 2).join("").toUpperCase();
  return <div className="min-h-screen lg:flex">
    <aside className="sticky top-0 hidden h-screen w-[252px] shrink-0 flex-col bg-[#1b2744] px-4 pb-6 pt-8 lg:flex">{navigation}</aside>
    {mobileOpen && <div className="fixed inset-0 z-50 bg-[#13203d]/50 lg:hidden" onClick={() => setMobileOpen(false)}><aside onClick={(event) => event.stopPropagation()} className="flex h-full w-[280px] flex-col bg-[#1b2744] px-4 pb-6 pt-8"><button aria-label="Close navigation" className="mb-3 self-end text-white" onClick={() => setMobileOpen(false)}><X/></button>{navigation}</aside></div>}
    <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-20 flex h-[78px] items-center justify-between border-b border-[#e9edf4] bg-white/95 px-5 backdrop-blur-sm sm:px-8 xl:px-12">
        <div className="flex items-center gap-4"><button aria-label="Open navigation" className="text-[#263756] lg:hidden" onClick={() => setMobileOpen(true)}><Menu/></button><div className="hidden text-[13px] text-[#93a0b5] sm:block">Workspace <span className="px-2 text-[#c7cddd]">/</span> <span className="font-semibold text-[#394765]">{items.find((item) => item.href === pathname)?.label || "Overview"}</span></div><div className="text-lg font-bold tracking-tight lg:hidden">bookly.</div></div>
        <div className="flex items-center gap-3 sm:gap-5"><div className="hidden text-right sm:block"><div className="text-[12px] font-bold">{user.name}</div><div className="text-[11px] capitalize text-[#97a2b5]">{user.role} account</div></div><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e8e6ff] text-xs font-extrabold text-[#6965dc]">{initials}</div><ChevronDown size={15} className="hidden text-[#a7b0c0] sm:block"/><button aria-label="Sign out" title="Sign out" onClick={() => signOut({ redirectTo: "/login" })} className="rounded-lg p-2 text-[#8f9aaf] transition-colors hover:bg-[#f2f4fa] hover:text-[#46546c]"><LogOut size={18}/></button></div>
      </header>
      <main className="mx-auto max-w-[1450px] px-5 pb-12 pt-8 sm:px-8 xl:px-12">{children}</main>
    </div>
  </div>;
}
