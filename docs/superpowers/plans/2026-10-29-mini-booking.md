# Mini Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a local-only, Docker-runnable Mini Booking application with genuine Keycloak SSO, SQLite persistence, and Playwright practice scenarios.

**Architecture:** Next.js App Router serves authenticated pages and JSON route handlers. Prisma accesses a single local SQLite file mounted persistently in the Next.js container. Auth.js delegates OIDC login to Keycloak in a second Compose service. Client components drive wizard, dialogs and data grids against authenticated JSON endpoints.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Prisma 7, SQLite, Auth.js 5 beta, Keycloak, Zod, Vitest, Playwright, Docker Compose.

**Spec:** `docs/superpowers/specs/2026-10-29-mini-booking-design.md`

## Global Constraints

- Local-only development; no production or deployment configuration.
- Application and auth must be real, not a simulated login or browser-only state.
- App data and E2E test data must be separate SQLite files, with idempotent seed/reset.
- Protect routes and API mutations server-side, including staff/admin authorization.
- All form fields have labels, validation errors and deterministic accessible test selectors.
- No external business integrations or real payment details.

## Review Focus

- Same service, date and time booked twice must return a conflict and no duplicate active booking.
- Invalid customer email and missing service must be rejected on the server.
- Staff cannot create/delete services through API even with direct requests.
- Unauthenticated users cannot access pages or JSON API data.
- Cancelling a booking frees its time slot for a new booking.

---

### Task 1: Foundation and booking validation

**Files:** `package.json`, TypeScript/Tailwind/Next configs, `src/lib/booking.ts`, `tests/unit/booking.test.ts`.

**Interfaces:** `bookingSchema`, `validateBooking(input)`, `BOOKING_TIMES`, `formatMoney(amount)`.

- [ ] Write unit tests for valid/invalid booking payload, past dates, allowed slots and currency formatting.
- [ ] Run `npm run test:unit` and observe missing-module failures.
- [ ] Add minimal validation and formatting implementation; run tests until passing.
- [ ] Run `npm run typecheck` and record outcome.

### Task 2: SQLite schema and repeatable seed

**Files:** `prisma/schema.prisma`, `prisma.config.ts`, `src/lib/db.ts`, `prisma/seed.ts`, `tests/unit/booking-rules.test.ts`.

**Interfaces:** `prisma`, `createBooking(input, userId)`, `BookingConflictError`, `seedDatabase()`.

- [ ] Add failing tests for overlap, cancellation reuse and persisted customer/booking.
- [ ] Generate Prisma client, apply SQLite schema and run test RED.
- [ ] Implement database operations and deterministic seed; run tests GREEN.
- [ ] Check repeated seed gives consistent results.

### Task 3: Keycloak authentication and authorization

**Files:** `src/auth.ts`, `src/lib/permissions.ts`, auth route, protected layout, login page, `keycloak/realm-export.json`, `tests/e2e/auth.spec.ts`.

**Interfaces:** `auth()`, `requireSession()`, `requireAdmin()`, `hasRole(session, role)`.

- [ ] Write Playwright SSO/login and denied-access tests.
- [ ] Configure Keycloak OIDC, JWT realm roles, protected navigation and API permission helpers.
- [ ] Verify via real Keycloak once Compose is available; do not report a pass otherwise.

### Task 4: Authenticated CRUD APIs

**Files:** `src/app/api/services/**`, `src/app/api/bookings/**`, `tests/e2e/booking.spec.ts`.

**Interfaces:** JSON endpoints `GET/POST /api/services`, `PATCH/DELETE /api/services/:id`, `GET/POST /api/bookings`, `PATCH /api/bookings/:id`.

- [ ] Add failing tests for services, booking conflicts, server validation and role permissions.
- [ ] Implement Zod-validated JSON handlers and pagination/filtering.
- [ ] Verify unit tests and API scenarios.

### Task 5: Four-screen UI and wizard

**Files:** `src/app/**`, `src/components/**`, `src/app/globals.css`, Playwright UI tests.

**Interfaces:** Sidebar and dashboard, services CRUD modal, bookings table/detail/cancel modal, 4-step booking wizard.

- [ ] Write E2E scenarios for wizard, filtering, CRUD, cancellation and empty/loading state.
- [ ] Implement accessible responsive UI and all form states.
- [ ] Run E2E tests if browser and Keycloak are available; otherwise preserve clear verification limit.

### Task 6: Local Docker and final verification

**Files:** `Dockerfile`, `compose.yaml`, `.dockerignore`, `.env.example`, `README.md`, Playwright config.

- [ ] Implement dev-only Next.js container with hot reload and persistent SQLite directory.
- [ ] Implement Keycloak `start-dev --import-realm`, named data volume, stable OIDC issuer hostname.
- [ ] Document `docker compose up -d --build`, seed/reset and test commands.
- [ ] Run unit suite, typecheck, Next build and actual browser checks; record Docker/SSO verification honestly.

