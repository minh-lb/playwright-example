import { expect, test, type Page } from "@playwright/test";
import { loginAs } from "./helpers";
import { createBooking, getServiceId, makeBookingPayload } from "./test-data";

type QueueJob = {
  id: number; type: string; bookingId: number | null;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  attempts: number; result: string | null; lastError: string | null; completedAt: string | null;
};
type QueueResponse = { items: QueueJob[]; counts: Record<string, number> };

async function getQueue(page: Page): Promise<QueueResponse> {
  const response = await page.request.get("/api/queue");
  expect(response.status()).toBe(200);
  return response.json();
}

async function waitForJob(page: Page, id: number, status: QueueJob["status"]): Promise<QueueJob> {
  await expect.poll(async () => {
    const queue = await getQueue(page);
    return queue.items.find((job) => job.id === id)?.status;
  }, { timeout: 20_000 }).toBe(status);
  const queue = await getQueue(page);
  const job = queue.items.find((item) => item.id === id);
  expect(job).toBeDefined();
  return job!;
}

async function enqueueDemo(page: Page, scenario: "success" | "retry" | "fail") {
  const response = await page.request.post("/api/queue", { data: { scenario } });
  expect(response.status()).toBe(201);
  return response.json() as Promise<QueueJob>;
}

test("booking confirmation is persisted and eventually processed by a separate worker", async ({ page }) => {
  await loginAs(page, "admin");
  const serviceId = await getServiceId(page);
  const booking = await createBooking(page, makeBookingPayload(serviceId));
  await expect.poll(async () => {
    const response = await getQueue(page);
    return response.items.filter((job) => job.bookingId === booking.id).length;
  }).toBe(1);
  const queued = (await getQueue(page)).items.find((job) => job.bookingId === booking.id)!;
  const processed = await waitForJob(page, queued.id, "COMPLETED");
  expect(processed.result).toContain(booking.reference);
  expect(processed.attempts).toBe(1);
});

test("demo jobs run in FIFO order and persist through dashboard refresh", async ({ page }) => {
  await loginAs(page, "admin");
  const first = await enqueueDemo(page, "success");
  const second = await enqueueDemo(page, "success");
  const completedFirst = await waitForJob(page, first.id, "COMPLETED");
  const completedSecond = await waitForJob(page, second.id, "COMPLETED");
  expect(Date.parse(completedFirst.completedAt!)).toBeLessThanOrEqual(Date.parse(completedSecond.completedAt!));

  await page.goto("/queue");
  const firstRow = page.locator(`tr[data-job-id="${first.id}"]`);
  await expect(firstRow).toContainText("completed", { timeout: 20_000 });
  await page.reload();
  await expect(page.locator(`tr[data-job-id="${first.id}"]`)).toContainText("completed");
});

test("automatic retry reaches Completed on attempt three", async ({ page }) => {
  await loginAs(page, "admin");
  const job = await enqueueDemo(page, "retry");
  const completed = await waitForJob(page, job.id, "COMPLETED");
  expect(completed.attempts).toBe(3);
  expect(completed.lastError).toBeNull();
});

test("exhausted job can be manually retried in the admin dashboard", async ({ page }) => {
  await loginAs(page, "admin");
  const job = await enqueueDemo(page, "fail");
  const failed = await waitForJob(page, job.id, "FAILED");
  expect(failed.attempts).toBe(3);
  expect(failed.lastError).toContain("Simulated queue failure");

  await page.goto("/queue");
  const row = page.locator(`tr[data-job-id="${job.id}"]`);
  await expect(row).toContainText("failed", { timeout: 20_000 });
  await row.getByRole("button", { name: "Retry job" }).click();
  await waitForJob(page, job.id, "COMPLETED");
  await expect(row).toContainText("completed", { timeout: 20_000 });
});

test("staff cannot access the queue dashboard or queue API", async ({ page }) => {
  await loginAs(page, "staff");
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Job queue" })).toHaveCount(0);
  expect((await page.request.get("/api/queue")).status()).toBe(403);
  expect((await page.request.post("/api/queue", { data: { scenario: "success" } })).status()).toBe(403);
  expect((await page.request.patch("/api/queue/1", { data: { action: "retry" } })).status()).toBe(403);
  await page.goto("/queue");
  await expect(page).toHaveURL(/\/dashboard/);
});

test("anonymous requests cannot list, enqueue, or retry queue jobs", async ({ page }) => {
  expect((await page.request.get("/api/queue")).status()).toBe(401);
  expect((await page.request.post("/api/queue", { data: { scenario: "success" } })).status()).toBe(401);
  expect((await page.request.patch("/api/queue/1", { data: { action: "retry" } })).status()).toBe(401);
});
