import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DashboardMetrics } from "./dashboard-metrics";
describe("DashboardMetrics", () => {
 it("renders stats", () => {
   const html = renderToStaticMarkup(createElement(DashboardMetrics, { data: { totalBookings: 12, upcoming: 3, activeServices: 5, clients: 9 } }));
   expect(html).toContain("Total bookings");
   expect(html).toContain("12");
   expect(html).toContain("Active services");
 });
});
