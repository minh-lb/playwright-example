import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { BookingsHeader } from "./bookings-header";

describe("BookingsHeader", () => {
  it("renders the expected state", () => {
    const html = renderToStaticMarkup(createElement(BookingsHeader, {}));
    expect(html).toContain("Bookings");
    expect(html).toContain("New booking");
  });
});
