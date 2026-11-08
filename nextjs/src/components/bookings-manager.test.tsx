import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BookingsManager } from "./bookings-manager";
describe("BookingsManager", () => {
  it("renders booking page scaffold", () => {
    const html = renderToStaticMarkup(createElement(BookingsManager));
    expect(html).toContain("Bookings");
    expect(html).toContain("Matching bookings");
  });
});
