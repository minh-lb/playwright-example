import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BookingWizard } from "./booking-wizard";
describe("BookingWizard", () => {
  it("renders initial booking step and summary", () => {
    const html = renderToStaticMarkup(createElement(BookingWizard));
    expect(html).toContain("Choose a service");
    expect(html).toContain("Booking summary");
  });
});
