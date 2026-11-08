import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { ServiceMetrics } from "./service-metrics";

describe("ServiceMetrics", () => {
  it("renders the expected state", () => {
    const html = renderToStaticMarkup(createElement(ServiceMetrics, { total: 6, visible: 5, active: 4 }));
    expect(html).toContain("Total services");
    expect(html).toContain("6");
    expect(html).toContain("Available on this page");
    expect(html).toContain("4");
  });
});
