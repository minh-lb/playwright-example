import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as pause } from "node:timers/promises";
import { encode } from "next-auth/jwt";

const port = 3456;
const url = `http://127.0.0.1:${port}`;
const env = {
  ...process.env,
  DATABASE_FILE: "test.db",
  AUTH_SECRET: "local-minibooking-smoke-secret-for-tests-only",
  AUTH_URL: url,
  AUTH_TRUST_HOST: "true",
  AUTH_KEYCLOAK_ID: "mini-booking",
  AUTH_KEYCLOAK_SECRET: "mini-booking-local-secret",
  AUTH_KEYCLOAK_ISSUER: `${url}/idp/realms/mini-booking`,
};
for (const command of ["db:generate", "db:init", "db:push", "db:reset"]) {
  const result = spawnSync("npm", ["run", command], { cwd: process.cwd(), env, encoding: "utf8" });
  assert.equal(result.status, 0, `${command} failed:\n${result.stderr}\n${result.stdout}`);
}
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
  cwd: process.cwd(), env, stdio: ["ignore", "pipe", "pipe"],
});

let logs = "";
server.stdout.on("data", (data) => { logs += data.toString(); });
server.stderr.on("data", (data) => { logs += data.toString(); });

try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(`Next.js exited early:\n${logs}`);
    try {
      const response = await fetch(`${url}/login`, { redirect: "manual" });
      if (response.status === 200) { ready = true; break; }
    } catch { /* waiting for server */ }
    await pause(250);
  }
  assert.ok(ready, `Next.js did not start:\n${logs}`);

  const cases = [
    { path: "/api/health", status: 200 },
    { path: "/login", status: 200 },
    { path: "/dashboard", status: 307, redirect: "/login" },
    { path: "/bookings/new", status: 307, redirect: "/login" },
    { path: "/api/services", status: 401 },
    { path: "/api/bookings", status: 401 },
    { path: "/api/availability?serviceId=1&date=2026-12-31", status: 401 },
  ];
  for (const check of cases) {
    const response = await fetch(url + check.path, { redirect: "manual" });
    assert.equal(response.status, check.status, `${check.path}: expected ${check.status}, got ${response.status}`);
    if (check.redirect) assert.ok(response.headers.get("location")?.includes(check.redirect), `${check.path} must redirect to ${check.redirect}`);
    console.log(`PASS ${check.path} → HTTP ${response.status}`);
  }
  const health = await (await fetch(`${url}/api/health`)).json();
  assert.equal(health.status, "ok");
  assert.equal(health.database, "test");

  // Test-only Auth.js sessions exercise protected page rendering and API
  // authorization. They do not substitute for real Keycloak SSO E2E tests.
  async function sessionCookie(role) {
    const token = await encode({
      token: { sub: role, name: role === "admin" ? "Alex Morgan" : "Jordan Lee", email: `${role}@bookly.local`, appRole: role },
      secret: env.AUTH_SECRET,
      salt: "authjs.session-token",
    });
    return `authjs.session-token=${token}`;
  }
  const adminCookie = await sessionCookie("admin");
  const staffCookie = await sessionCookie("staff");
  async function authenticated(path, cookie, options = {}) {
    return fetch(url + path, { redirect: "manual", ...options, headers: { cookie, ...options.headers } });
  }
  for (const path of ["/dashboard", "/services", "/bookings", "/bookings/new"]) {
    const response = await authenticated(path, adminCookie);
    assert.equal(response.status, 200, `Admin ${path}: got ${response.status}`);
    console.log(`PASS admin ${path} → HTTP 200`);
  }
  const staffServices = await authenticated("/services", staffCookie);
  const staffHtml = staffServices.status === 200 ? await staffServices.text() : "";
  assert.ok(
    (staffServices.status === 307 && staffServices.headers.get("location")?.includes("/dashboard")) ||
      (staffServices.status === 200 && staffHtml.includes("NEXT_REDIRECT") && staffHtml.includes("url=/dashboard")),
    "Staff should be redirected away from the admin-only services page",
  );
  console.log("PASS staff /services → redirected to dashboard");

  const services = await authenticated("/api/services", adminCookie);
  assert.equal(services.status, 200);
  const serviceItems = (await services.json()).items;
  assert.ok(serviceItems.length >= 6);
  const deniedService = await authenticated("/api/services", staffCookie, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Forbidden", description: "Denied to staff", category: "Wellness", durationMinutes: 60, price: 100000, color: "rose", active: true }),
  });
  assert.equal(deniedService.status, 403);
  console.log("PASS admin service list / staff denied create");

  const serviceDraft = { name: "Smoke Workshop", description: "End-to-end API smoke service", category: "Coaching", durationMinutes: 60, price: 275000, color: "cyan", active: true };
  const createdServiceResponse = await authenticated("/api/services", adminCookie, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(serviceDraft),
  });
  assert.equal(createdServiceResponse.status, 201);
  const createdService = await createdServiceResponse.json();
  const updatedServiceResponse = await authenticated(`/api/services/${createdService.id}`, adminCookie, {
    method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ price: 285000 }),
  });
  assert.equal(updatedServiceResponse.status, 200);
  assert.equal((await updatedServiceResponse.json()).price, 285000);
  const archiveServiceResponse = await authenticated(`/api/services/${createdService.id}`, adminCookie, { method: "DELETE" });
  assert.equal(archiveServiceResponse.status, 200);
  console.log("PASS admin service create / update / archive");

  const bookingInput = {
    serviceId: serviceItems[0].id,
    date: new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10),
    timeSlot: "16:00", customerName: "Smoke Tester", customerEmail: "smoke@example.com", customerPhone: "0901234567", notes: "",
  };
  const postBooking = () => authenticated("/api/bookings", adminCookie, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(bookingInput),
  });
  const created = await postBooking();
  assert.equal(created.status, 201, `Create booking: HTTP ${created.status}`);
  const createdBooking = await created.json();
  assert.ok(createdBooking.reference.startsWith("BK-"));
  const availabilityUrl = `/api/availability?serviceId=${bookingInput.serviceId}&date=${bookingInput.date}`;
  const occupied = await (await authenticated(availabilityUrl, adminCookie)).json();
  assert.ok(occupied.booked.includes("16:00"));
  const conflict = await postBooking();
  assert.equal(conflict.status, 409, "Duplicate active slot must be rejected");
  const cancel = await authenticated(`/api/bookings/${createdBooking.id}`, adminCookie, {
    method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "CANCELED" }),
  });
  assert.equal(cancel.status, 200);
  const availableAgain = await (await authenticated(availabilityUrl, adminCookie)).json();
  assert.ok(!availableAgain.booked.includes("16:00"));
  const rebook = await postBooking();
  assert.equal(rebook.status, 201, "Cancelled slot must be reusable");
  console.log("PASS booking create / conflict / cancel / rebook");
  console.log("Smoke suite passed");
} catch (error) {
  console.error(error);
  console.error(logs.slice(-3000));
  process.exitCode = 1;
} finally {
  server.kill("SIGTERM");
}
