import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueueManager } from "./queue-manager";
describe("QueueManager", () => {
  it("renders queue dashboard and demo controls", () => {
    const html = renderToStaticMarkup(createElement(QueueManager));
    expect(html).toContain("Job Queue");
    expect(html).toContain("Demo job scenario");
  });
});
