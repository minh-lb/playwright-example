import assert from "node:assert/strict";

const base = process.env.BASE_URL || "http://localhost:3000";
async function check(path, status) {
  const response = await fetch(base + path, { redirect: "manual" });
  assert.equal(response.status, status, `${path} returned HTTP ${response.status}`);
  console.log(`PASS ${path} → HTTP ${status}`);
  return response;
}

await check("/login", 200);
const health = await check("/api/health", 200);
assert.equal((await health.json()).status, "ok");
for (const path of ["/api/services", "/api/bookings", "/api/queue", "/api/availability?serviceId=1&date=2030-12-31"]) {
  await check(path, 401);
}
console.log("Smoke passed");
