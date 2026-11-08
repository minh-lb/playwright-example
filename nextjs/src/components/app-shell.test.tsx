import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
vi.mock("next-auth/react", () => ({ signOut: () => Promise.resolve() }));
import { AppShell } from "./app-shell";
describe("AppShell", () => {
  it("renders a staff navigation without admin links", () => {
    const html = renderToStaticMarkup(createElement(AppShell, {
      user: { email: "staff@bookly.local", role: "staff", name: "Staff Example" },
      children: createElement("span", null, "Workspace"),
    }));
    expect(html).toContain("Workspace");
    expect(html).toContain("Dashboard");
    expect(html).not.toContain("Job queue");
  });
});
