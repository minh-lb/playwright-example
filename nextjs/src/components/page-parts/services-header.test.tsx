import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { ServicesHeader } from "./services-header";

describe("ServicesHeader", () => {
  it("renders the expected state", () => {
    const html = renderToStaticMarkup(createElement(ServicesHeader, { onAdd: () => {} }));
    expect(html).toContain("Services");
    expect(html).toContain("Add service");
  });
});
