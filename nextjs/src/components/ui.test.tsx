import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Button, StatusPill, Spinner, EmptyState, Modal, Toast } from "./ui";
describe("Shared UI components", () => {
  it("renders buttons and status", () => {
    expect(renderToStaticMarkup(createElement(Button, null, "Save"))).toContain("Save");
    expect(renderToStaticMarkup(createElement(StatusPill, { status: "COMPLETED" }))).toContain("completed");
  });
  it("renders spinner and empty states", () => {
    expect(renderToStaticMarkup(createElement(Spinner, { label: "Loading jobs" }))).toContain("Loading jobs");
    expect(renderToStaticMarkup(createElement(EmptyState, { title: "Empty", description: "No rows" }))).toContain("No rows");
  });
  it("renders overlays", () => {
    expect(renderToStaticMarkup(createElement(Modal, { title: "Details", onClose() {}, children: "Body" }))).toContain("Details");
    expect(renderToStaticMarkup(createElement(Toast, { message: "Saved", onClose() {} }))).toContain("Saved");
  });
});
