import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { BookingStepProgress } from "./booking-step-progress";

describe("BookingStepProgress", () => {
  it("renders the expected state", () => {
    const html = renderToStaticMarkup(createElement(BookingStepProgress, { titles: ['Choose a service', 'Date & time', 'Your details', 'Review & confirm'], step: 1 }));
    expect(html).toContain("Step 1");
    expect(html).toContain("Choose a service");
    expect(html).toContain("Step 2");
    expect(html).toContain("Date & time");
  });
});
