# Background Job Queue v1 Design

**Date:** 2026-10-30
**Repo:** minh-lb/playwright-example

## Intent

Extend the local-only Bookly appointment demo with a genuine, persistent background queue so Playwright can exercise eventual consistency, retries, failure, recovery and admin authorization.

## Approaches

- **Selected:** SQLite/Prisma-backed queue plus a separate Node.js polling worker. Reuses the existing SQLite file, runs locally with Docker Compose and requires no new infrastructure.
- **Considered:** BullMQ/Redis, which is a strong multi-worker production solution but adds an unnecessary service and dependency to this local-only demo.
- **Not selected:** In-request processing, which would not exercise a real asynchronous worker.

## Behavior

1. A successful booking creates exactly one BOOKING_CONFIRMATION job in the same SQLite transaction; a rejected booking creates none. Confirmation is **simulated** by recording an audit result in the job, never by sending real email.
2. One worker processes due jobs in FIFO order (createdAt, id). States: PENDING, PROCESSING, COMPLETED, FAILED. A job has at most three attempts. Failed attempts retry with short exponential backoff; an exhausted job is terminal until an administrator retries it.
3. Claims use conditional updates, and a lease allows abandoned PROCESSING jobs to be recovered after a worker crash. Attempt count and job state survive server restarts. A canceled booking is not sent a confirmation: its job completes with a skipped result.
4. Admin-only /queue page and /api/queue endpoints provide live status, counts, details and manual retry. Staff has no access. Admins can enqueue demo jobs with success / two transient failures / permanent failure scenarios to practice E2E without external email services. Retrying clears the simulated failure so it can succeed.
5. Worker is an independent process launched by Docker Compose; in GitHub Actions it is run in the background against test.db. It does not auto-start inside the Next.js route handler.
6. Database reset removes jobs before deleting bookings. Existing booking and role behavior stays unchanged.

## Goals / Limits

- Local-only, Keycloak SSO and existing Tailwind UI, no Redis, SMTP, production deployment or queue SaaS.
- Real state persisted in SQLite; avoid timers inside Next.js handlers.
- Test scenarios: enqueue on booking, FIFO, automatic retries, failure exhaustion, admin manual retry, auth denial, state surviving refresh, and pending jobs when no worker is active.
- Playwright waits on observable state, not arbitrary sleeps. Unit and HTTP smoke tests also cover queue boundaries.
- Existing CI will run npm unit/smoke and Chromium E2E with a separate worker process.
- Manual retry is restricted to FAILED jobs. No externally visible email is sent.

## Notes

Single-worker ordering is intentional. This is a teaching demonstration, not a distributed exactly-once mail delivery service. SQLite serves as the durable queue storage.
