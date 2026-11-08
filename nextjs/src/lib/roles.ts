export type AppRole = "admin" | "staff";

export function roleFromAccessToken(accessToken: unknown): AppRole | null {
  if (typeof accessToken !== "string") return null;
  try {
    const encoded = accessToken.split(".")[1];
    if (!encoded) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
      realm_access?: { roles?: unknown };
    };
    const roles = payload.realm_access?.roles;
    if (!Array.isArray(roles)) return null;
    if (roles.includes("admin")) return "admin";
    if (roles.includes("staff")) return "staff";
    return null;
  } catch {
    return null;
  }
}
