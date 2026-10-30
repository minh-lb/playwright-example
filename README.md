# Playwright Example

A **local-only** appointment management app for practicing realistic Playwright tests. It uses **Next.js App Router, TypeScript, Tailwind CSS, SQLite/Prisma, and genuine Keycloak SSO**. Everything runs on your machine; no production configuration, cloud database, or external API is required.

## Features

- Keycloak OpenID Connect sign-in and sign-out, server-protected pages and APIs
- `admin` and `staff` roles: only administrators can manage services
- Dashboard with statistics, activity chart, recent bookings and revenue snapshot
- Service CRUD (with safe archive), filters, search, pagination, edit dialogs
- Bookings table with search, status filtering, sorting, pagination and details dialog
- Four-step booking wizard: **service → date/time → customer → review**
- Server validation, occupied slot detection, conflicting booking response, cancellation and rebooking
- Loading, empty, error and success states; responsive sidebar and accessible labels
- Durable SQLite job queue with an independent background worker, bounded retries, lease recovery and admin queue dashboard
- Demo queue scenarios (success, two retries, permanent failure) and manual retry for Playwright practice
- Seeded demo data and isolated SQLite file for tests

## Prerequisites

- Docker Engine/Desktop with Docker Compose v2
- Node.js 24 and npm for running Playwright/verification on the host
- Playwright Chromium browser installed on the host

## Start locally

```bash
docker compose up -d --build
docker compose logs -f web keycloak queue-worker
```

Open the app at **http://localhost:3000**. Keycloak login and its admin console use **http://localhost:8080/idp**. After signing in, Keycloak redirects back to the app callback at `http://localhost:3000/api/auth/callback/keycloak`. The browser uses Keycloak's public issuer on port `8080`; the web container uses the internal `keycloak:8080` endpoint for OIDC backchannel requests.

The web container generates Prisma Client, initializes SQLite, synchronizes the schema, adds demo data, and then starts Next.js with hot reload. The separate `queue-worker` service waits for web health and processes jobs from the same SQLite file. Use `docker compose logs -f queue-worker` to follow it. The source is bind-mounted and changes appear without rebuilding the image.

### Background queue

Creating a booking inserts exactly one `BOOKING_CONFIRMATION` job in the same database transaction. The independent Node worker processes jobs asynchronously; for this demo it records a simulated confirmation outcome in SQLite and **does not send real email**.

Admins can open **http://localhost:3000/queue** to see recent jobs, status counts, attempt numbers and errors. Use the demo scenario dropdown to queue a successful job, a job that fails twice and succeeds, or one that exhausts all 3 attempts. Filter by status and page through the full job history to find and retry older failures. Failed jobs have a **Retry** action. Staff cannot view or control the queue. Pending/Processing/Completed/Failed states survive reloads.

The worker polls every 300 ms, claims jobs FIFO with conditional writes, retries failed attempts with backoff, and can reclaim a job abandoned by a crashed worker after its lease expires. It intentionally uses a single worker for predictable local exercises.

To run only the worker outside Docker (with the same selected database):

```bash
npm run queue:worker
```

### Demo users

| Role | Username | Password | Can manage services? |
| --- | --- | --- | --- |
| Admin | `admin` | `Admin123!` | Yes |
| Staff | `staff` | `Staff123!` | No |

Keycloak Admin Console: `admin` / `local-keycloak-admin`. These are **development-only example credentials**. Do not reuse them in a real environment.

### Stop

```bash
docker compose down
```

SQLite data remains at `data/dev.db` after restarting containers. Keycloak state is kept in a named Docker volume. `docker compose down -v` removes Docker-managed volumes, so use it only if you intentionally want to reset that state; it does not remove `data/*.db` bind-mounted files.

## Run tests

Install host-side dependencies once:

```bash
npm ci
npx playwright install chromium
```

### Unit tests and HTTP integration smoke test

```bash
npm run test:unit
npm run test:smoke
npm run typecheck
npm run build
```

- Unit tests validate forms, Keycloak role mapping, service data, booking conflicts, cancellation reuse, and transitions.
- The smoke test starts Next.js on a temporary port and checks HTTP routes, SQLite health, role authorization and booking APIs. It creates **test-only signed Auth.js sessions** to verify application behavior independently of Keycloak. It does **not** prove the full SSO redirect flow.

### Real Keycloak + Playwright E2E

Use the dedicated test database when starting the same local Docker stack:

```bash
docker compose down
DATABASE_FILE=test.db docker compose up -d --build web keycloak
E2E_START_QUEUE_WORKER=1 npm run test:e2e
```

The Playwright global setup checks that the web container is actually using `test.db`, waits for Keycloak OIDC discovery, resets test fixtures, and then starts a host worker when `E2E_START_QUEUE_WORKER=1`. Do not also start the Compose queue-worker during E2E, or multiple workers will process jobs simultaneously. This prevents a normal test command from silently modifying `dev.db`.

For the interactive Playwright runner:

```bash
npm run test:e2e:ui
```

After testing, return to normal development mode:

```bash
docker compose down
docker compose up -d
```

The E2E suite covers queue enqueue, FIFO, retries, exhaustion, manual retry, persistence and access control, plus Keycloak login/logout and role access, dashboard statistics, the booking wizard and validation errors, booking search/filter/sort/pagination/status changes, slot conflicts and reuse, service search/filter/pagination/CRUD/archive, and API authorization/error cases. Keep Docker running while Playwright executes.

## Database commands

Inside the running web container:

```bash
docker compose exec web npm run db:seed
docker compose exec web npm run db:reset
docker compose exec web npm run db:push
```

The selected database is determined by `DATABASE_FILE` (`dev.db` by default, `test.db` for test mode). `db:reset` deletes bookings/customers/services **in the selected database only**, then restores the demo fixtures.

## Project structure

```text
src/app/               Next.js routes, login, dashboard, JSON APIs
src/components/        Sidebar, grids, dialogs, wizard and UI primitives
src/lib/               Prisma client, validation, booking rules, roles and queue engine
prisma/                SQLite schema, init, seed and reset scripts
keycloak/              Importable local realm and two demo users
tests/unit/            Vitest unit tests
tests/e2e/             Playwright SSO and UI workflows
scripts/queue-worker.ts Standalone SQLite worker process
scripts/smoke.mjs      HTTP integration verification
compose.yaml           Local-only Next.js, Keycloak and queue worker containers
```

## Troubleshooting

- **SSO login fails:** wait for Keycloak startup and inspect `docker compose logs keycloak web`. Test `http://localhost:8080/idp/realms/mini-booking/.well-known/openid-configuration` and confirm its issuer is `http://localhost:8080/idp/realms/mini-booking`.
- **Port 3000/8080 occupied:** stop the conflicting application. These local ports are intentionally fixed for predictable OIDC redirect URLs.
- **Realm changes do not appear:** Keycloak imports the realm only when it is first created. Existing Keycloak volume state wins over a revised import JSON.
- **SQLite cannot open file:** confirm the local `data/` directory is writable by the Next.js container.
- **Playwright browser missing:** run `npx playwright install chromium` on your computer.
- **Tests reject the database:** ensure you started Compose with `DATABASE_FILE=test.db` before running `npm run test:e2e`.

This is a learning/testing application, not a production-ready identity or booking service.
