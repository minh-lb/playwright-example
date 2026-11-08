import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ServicesManager } from "./services-manager";
describe("ServicesManager", () => {
  it("renders service page scaffold", () => {
    const html = renderToStaticMarkup(createElement(ServicesManager));
    expect(html).toContain("Services");
    expect(html).toContain("Total services");
  });
});
