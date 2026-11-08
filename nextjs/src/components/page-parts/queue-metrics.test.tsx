import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { QueueMetrics } from "./queue-metrics";

describe("QueueMetrics", () => {
  it("renders the expected state", () => {
    const html = renderToStaticMarkup(createElement(QueueMetrics, { counts: { PENDING: 2, PROCESSING: 0, COMPLETED: 4, FAILED: 1 } }));
    expect(html).toContain("pending");
    expect(html).toContain("2");
    expect(html).toContain("failed");
    expect(html).toContain("1");
  });
});
