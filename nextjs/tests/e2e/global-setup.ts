import { execFileSync } from "node:child_process";
import path from "node:path";
import { setTimeout as pause } from "node:timers/promises";

const projectRoot = path.resolve(process.cwd(), "..");
function compose(...args: string[]) {
  return execFileSync("docker", ["compose", "-f", "docker-compose.yml", ...args], {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
}

export default async function globalSetup() {
  let healthReady = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    const response = await fetch("http://localhost:3000/api/health").catch(() => null);
    if (response?.ok) {
      const health = await response.json() as { database?: string };
      if (health.database !== "test") {
        throw new Error("E2E requires DATABASE_FILE=test.sqlite in Docker Compose.");
      }
      healthReady = true;
      break;
    }
    await pause(500);
  }
  if (!healthReady) throw new Error("Next.js/Laravel health is unavailable.");

  let oidcReady = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    const response = await fetch(
      "http://localhost:8080/idp/realms/mini-booking/.well-known/openid-configuration",
    ).catch(() => null);
    if (response?.ok) {
      const metadata = await response.json() as { issuer?: string };
      if (metadata.issuer !== "http://localhost:8080/idp/realms/mini-booking") {
        throw new Error("Unexpected Keycloak issuer");
      }
      oidcReady = true;
      break;
    }
    await pause(500);
  }
  if (!oidcReady) throw new Error("Keycloak OIDC discovery is unavailable.");

  compose("stop", "queue-worker");
  try {
    compose("exec", "-T", "laravel", "php", "artisan", "booking:reset-demo");
  } finally {
    compose("start", "queue-worker");
  }
}
