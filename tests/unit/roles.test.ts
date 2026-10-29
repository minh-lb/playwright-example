import { describe, expect, it } from "vitest";
import { roleFromAccessToken } from "../../src/lib/roles";

function tokenWithRoles(roles: string[]) {
  const body = Buffer.from(JSON.stringify({ realm_access: { roles } })).toString("base64url");
  return `header.${body}.signature`;
}

describe("Keycloak realm roles", () => {
  it("prefers admin when both admin and staff are present", () => {
    expect(roleFromAccessToken(tokenWithRoles(["staff", "admin"]))).toBe("admin");
  });

  it("recognizes staff", () => {
    expect(roleFromAccessToken(tokenWithRoles(["staff"]))).toBe("staff");
  });

  it("rejects missing roles", () => {
    expect(roleFromAccessToken(tokenWithRoles(["default-roles-mini-booking"]))).toBe(null);
  });

  it("rejects malformed tokens", () => {
    expect(roleFromAccessToken("broken-token")).toBe(null);
  });
});
