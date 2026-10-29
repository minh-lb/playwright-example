import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bookly — Appointment workspace",
  description: "A real local booking dashboard built for Playwright testing.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
