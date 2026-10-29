import { execFileSync } from "node:child_process";
import { setTimeout as pause } from "node:timers/promises";

// E2E always resets the isolated test database; never reset the user's dev.db.
export default async function globalSetup() {
  const response = await fetch("http://localhost:3000/api/health").catch(() => null);
  if (!response?.ok || (await response.json()).database !== "test") {
    throw new Error("Start the app with DATABASE_FILE=test.db and Keycloak on localhost:8080 before running E2E tests.");
  }
  let keycloakReady = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    const discovery = await fetch("http://localhost:8080/idp/realms/mini-booking/.well-known/openid-configuration").catch(() => null);
    if (discovery?.ok) {
      const metadata = await discovery.json() as { issuer?: string };
      const expectedIssuer = "http://localhost:8080/idp/realms/mini-booking";
      if (metadata.issuer !== expectedIssuer) {
        throw new Error(`Keycloak issuer mismatch: expected ${expectedIssuer}, got ${metadata.issuer || "no issuer"}`);
      }
      keycloakReady = true;
      break;
    }
    await pause(500);
  }
  if (!keycloakReady) throw new Error("Keycloak OIDC discovery is unavailable at localhost:8080; check Keycloak and app startup logs.");
  const env = { ...process.env, DATABASE_FILE: "test.db" };
  // The runner or web container generates Prisma Client before app startup.
  for (const command of ["db:init", "db:push", "db:reset"]) {
    execFileSync("npm", ["run", command], { cwd: process.cwd(), env, stdio: "inherit" });
  }
}
