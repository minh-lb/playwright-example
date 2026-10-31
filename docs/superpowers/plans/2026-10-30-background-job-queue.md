# Background Job Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent background job queue with admin dashboard, retry and Playwright coverage to the local booking demo.

**Architecture:** Booking creation inserts a queue row in the same transaction. An independent Node worker claims SQLite-backed jobs and records demo confirmation outcomes, with bounded retries and lease recovery. Admin APIs and a polling UI expose observable job states.

**Tech Stack:** Next.js 16, Prisma 7 + SQLite, Node.js 24, Tailwind, Keycloak, Vitest, Playwright, Docker Compose.

**Spec:** `docs/superpowers/specs/2026-10-30-background-job-queue-design.md`

## Global Constraints

- Local only; no external Redis or email provider.
- `test.db` isolation remains mandatory in E2E and CI.
- Queue status names: PENDING, PROCESSING, COMPLETED, FAILED.
- Maximum attempts: 3; FIFO single worker; admin-only management.
- Booking and job insert share one transaction; no duplicate booking job.

## Review Focus

1. A cancelled booking before processing must not be marked as a sent confirmation — unit test of cancellation branch.
2. Abandoned PROCESSING jobs must recover from an expired lease — unit test for reclaim.
3. A second worker must not double-claim a job — unit test for conditional claim.
4. A failed booking creation must enqueue nothing — unit integration test for booking conflict.
5. Concurrent reset/worker use of `test.db` must not corrupt tests — start worker after E2E fixture reset and stop it after tests; documented commands.

---

### Task 1: Persistence and queue engine

**Files:**
- Modify: `prisma/schema.prisma`, `src/lib/booking-rules.ts`, `prisma/reset.ts`, `tests/unit/booking-rules.test.ts`
- Create: `src/lib/job-queue.ts`, `scripts/queue-worker.ts`, `tests/unit/job-queue.test.ts`

**Interfaces:**
- Produces: `processNextJob(): Promise<boolean>`, `retryFailedJob(id: number)`, `claimNextJob(now?: Date)`, `queueRetryAt(attempts: number, now?: Date): Date`
- Produces: Prisma `Job` model with unique optional bookingId and demo scenarios.

- [ ] Write tests that assert enqueuing with a booking, FIFO claims, bounded retry, permanent failed state, skipped cancelled notification, stale lease, and idempotent booking job.
- [ ] Run `npm run test:unit` (RED: missing Job model/functions).
- [ ] Implement Prisma model, transactional enqueue and worker engine; use conditional update to claim.
- [ ] Run `npm run test:unit` (GREEN).
- [ ] Commit `feat: persist and process background jobs`.

### Task 2: Authenticated APIs and queue dashboard

**Files:**
- Create: `src/app/api/queue/route.ts`, `src/app/api/queue/[id]/route.ts`, `src/app/(protected)/queue/page.tsx`, `src/components/queue-manager.tsx`
- Modify: `src/components/app-shell.tsx`, `scripts/smoke.mjs`

**Interfaces:**
- Produces: GET/POST `/api/queue`, PATCH `/api/queue/[id]` with `{ action: "retry" }`.
- Consumes: `retryFailedJob` from Task 1 and `prisma.job`.

- [ ] Write smoke/E2E assertions for unauthorized/staff denial, demo creation, admin retry and dashboard state.
- [ ] Run tests and record RED.
- [ ] Implement API/admin role checks, UI polling and Retry interaction.
- [ ] Run `npm run test:smoke` and E2E, record GREEN.
- [ ] Commit `feat: add queue monitoring and retry controls`.

### Task 3: Local worker orchestration and verification

**Files:**
- Modify: `package.json`, `compose.yaml`, `.github/workflows/test.yml`, `README.md`
- Create: `tests/e2e/queue.spec.ts`

**Interfaces:**
- Produces: `npm run queue:worker` (standalone process), CI-launched worker after test DB reset.

- [ ] Add E2E scenarios for eventual completion, FIFO, automatic retries, exhaustion, manual retry and page persistence.
- [ ] Run E2E and record RED where new behavior is absent.
- [ ] Wire worker into Compose and CI without touching `dev.db` during E2E; document local setup.
- [ ] Run `npm run typecheck`, `npm run test:unit`, `npm run test:smoke`, `npm run test:e2e`, `npm run build` and review CI statuses.
- [ ] Commit `test: cover background queue workflows`.

## Verification constraint

If the local executor is unavailable, run the full suite in GitHub Actions on the PR, inspect the individual check conclusions and logs, and report any unverified areas explicitly. Do not claim a green test suite without observed passing CI output.
