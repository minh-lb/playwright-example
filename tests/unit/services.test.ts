import { describe, expect, it } from "vitest";
import { serviceSchema, slugifyServiceName } from "../../src/lib/services";

const service = { name: "Design Review", description: "Review a design", category: "Consultation", durationMinutes: 60, price: 300000, color: "cyan", active: true };

describe("service validation", () => {
  it("accepts a complete service", () => {
    expect(serviceSchema.safeParse(service).success).toBe(true);
  });

  it("rejects a zero price", () => {
    expect(serviceSchema.safeParse({ ...service, price: 0 }).success).toBe(false);
  });

  it("rejects missing service names", () => {
    expect(serviceSchema.safeParse({ ...service, name: "" }).success).toBe(false);
  });

  it("creates stable URL-safe slugs", () => {
    expect(slugifyServiceName("  Career & Life Coaching ")).toBe("career-life-coaching");
  });
});
