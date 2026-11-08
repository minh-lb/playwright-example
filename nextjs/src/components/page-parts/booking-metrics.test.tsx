import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { BookingMetrics } from "./booking-metrics";

describe("BookingMetrics", () => {
  it("renders the expected state", () => {
    const html = renderToStaticMarkup(createElement(BookingMetrics, { total: 12, confirmed: 3, completed: 2 }));
    expect(html).toContain("Matching bookings");
    expect(html).toContain("12");
    expect(html).toContain("Confirmed on page");
    expect(html).toContain("3");
    expect(html).toContain("Completed on page");
    expect(html).toContain("2");
  });
});
