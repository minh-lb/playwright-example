import { execFileSync } from "node:child_process";
import { setTimeout as pause } from "node:timers/promises";

// E2E always resets the isolated test database; never reset the user's dev.db.
export default async function globalSetup() {
  const response = await fetch("http://localhost:3000/api/health").catch(() => null);
  if (!response?.ok || (await response.json()).database !== "test") {
    throw new Error("Start the Docker stack in test mode first: DATABASE_FILE=test.db docker compose up -d --build");
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
  if (!keycloakReady) throw new Error("Keycloak OIDC discovery is unavailable at localhost:8080; check docker compose logs keycloak web");
  const env = { ...process.env, DATABASE_FILE: "test.db" };
  // The healthy web container has already generated Prisma Client. Regenerating
  // it here from the host can fail when Docker owns files in the bind-mounted repo.
  for (const command of ["db:init", "db:push", "db:reset"]) {
    execFileSync("npm", ["run", command], { cwd: process.cwd(), env, stdio: "inherit" });
  }
}
