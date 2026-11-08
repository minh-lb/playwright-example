import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DashboardRecentBookings } from "./dashboard-recent-bookings";
describe("DashboardRecentBookings", () => {
 it("shows empty state", () => {
   const html = renderToStaticMarkup(createElement(DashboardRecentBookings, { bookings: [] }));
   expect(html).toContain("No bookings yet");
 });
 it("renders booking", () => {
   const html = renderToStaticMarkup(createElement(DashboardRecentBookings, { bookings: [{
     id: 1, reference: "BK-DEMO", date: "2026-12-01", timeSlot: "09:00", status: "CONFIRMED",
     customer: { name: "Test Customer" }, service: { name: "Consultation", price: 250000 },
   }] }));
   expect(html).toContain("BK-DEMO");
   expect(html).toContain("Test Customer");
 });
});
