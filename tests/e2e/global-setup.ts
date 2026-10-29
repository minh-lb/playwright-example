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
    const discovery = await fetch("http://localhost:3000/idp/realms/mini-booking/.well-known/openid-configuration").catch(() => null);
    if (discovery?.ok) { keycloakReady = true; break; }
    await pause(500);
  }
  if (!keycloakReady) throw new Error("Keycloak OIDC discovery is unavailable through /idp; check docker compose logs keycloak web");
  const env = { ...process.env, DATABASE_FILE: "test.db" };
  for (const command of ["db:generate", "db:init", "db:push", "db:reset"]) {
    execFileSync("npm", ["run", command], { cwd: process.cwd(), env, stdio: "inherit" });
  }
}
