import { redirect } from "next/navigation";
import { CalendarCheck2, CheckCircle2, LockKeyhole, Sparkles } from "lucide-react";
import { auth, signIn } from "@/auth";

export default async function LoginPage() {
  const session = await auth();
  if ((session?.user as { role?: string } | undefined)?.role) redirect("/dashboard");
  async function login() {
    "use server";
    await signIn("keycloak", { redirectTo: "/dashboard" });
  }
  return <div className="grid min-h-screen lg:grid-cols-2">
    <div className="relative hidden overflow-hidden bg-[#1d2848] p-14 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="absolute -left-28 top-40 h-80 w-80 rounded-full bg-[#6663ed]/35 blur-[100px]"/><div className="absolute -right-36 bottom-5 h-96 w-96 rounded-full bg-[#8864ce]/25 blur-[100px]"/>
      <div className="relative flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#7873f7]"><CalendarCheck2/></span><span className="text-3xl font-extrabold tracking-tight">bookly.</span></div>
      <div className="relative max-w-lg"><div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-[#c8c7ff]"><Sparkles size={14}/> Your day, beautifully organized</div><h1 className="text-5xl font-extrabold leading-[1.13] tracking-[-2px]">Great appointments start with <span className="text-[#a7a2ff]">great planning.</span></h1><p className="mt-6 max-w-md text-[15px] leading-7 text-[#aab5d1]">One calm workspace for every service, customer, and booking. Spend less time organizing and more time doing what matters.</p><div className="mt-12 flex gap-8 text-sm text-[#c6cee2]"><span className="flex items-center gap-2"><CheckCircle2 size={17} className="text-[#aaa6ff]"/> Simple scheduling</span><span className="flex items-center gap-2"><CheckCircle2 size={17} className="text-[#aaa6ff]"/> Secure sign-in</span></div></div>
      <p className="relative text-xs text-[#8491b3]">© 2026 Bookly. Local testing workspace.</p>
    </div>
    <div className="flex min-h-screen items-center justify-center bg-[#fafbfe] px-6 py-14"><div className="w-full max-w-[420px]">
      <div className="mb-10 flex items-center gap-3 lg:hidden"><CalendarCheck2 className="text-[#7771f8]"/><span className="text-2xl font-extrabold">bookly.</span></div>
      <div className="mb-9 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eeedff] text-[#6d67e5]"><LockKeyhole size={27}/></div>
      <p className="mb-2 text-xs font-extrabold uppercase tracking-[.2em] text-[#7771f8]">Welcome back</p><h2 className="text-[33px] font-extrabold tracking-[-1.2px]">Sign in to Bookly</h2><p className="mt-3 text-sm leading-6 text-[#8d98ae]">Continue securely with your organization account to access your booking workspace.</p>
      <form action={login} className="mt-9"><button type="submit" className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#6e68ed] px-5 text-sm font-bold text-white shadow-[0_8px_22px_#6e68ed33] transition-colors hover:bg-[#5e57d9]"><LockKeyhole size={17}/> Continue with Keycloak <span aria-hidden="true">→</span></button></form>
      <div className="mt-7 rounded-xl border border-[#e7eaf3] bg-white p-4 text-xs leading-6 text-[#8390aa]"><div className="mb-1 font-bold text-[#4b5773]">Demo access</div><span>Admin: <strong>admin / Admin123!</strong></span><br/><span>Staff: <strong>staff / Staff123!</strong></span></div>
      <p className="mt-8 text-center text-xs text-[#a0a9b9]">Protected with Keycloak OpenID Connect</p>
    </div></div>
  </div>;
}
