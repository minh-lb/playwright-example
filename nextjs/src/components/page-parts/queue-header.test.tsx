import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { QueueHeader } from "./queue-header";

describe("QueueHeader", () => {
  it("renders the expected state", () => {
    const html = renderToStaticMarkup(createElement(QueueHeader, { onRefresh: () => {} }));
    expect(html).toContain("Job Queue");
    expect(html).toContain("Refresh");
  });
});
