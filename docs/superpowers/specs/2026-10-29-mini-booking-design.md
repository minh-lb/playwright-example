# Mini Booking design

## Purpose

A local-only Next.js application for realistic Playwright E2E practice.

## Scope

- Next.js App Router, TypeScript, Tailwind CSS, accessible UI components.
- SQLite persistence via Prisma for services, customers and bookings.
- Keycloak OIDC SSO through Auth.js, with admin and staff roles.
- Dashboard, service CRUD, bookings list/detail/status actions, and four-step booking wizard.
- Search, filtering, sorting, pagination, validation, notifications, confirmation dialogs, loading/empty/error states.
- Real Keycloak demo realm and users, seeded app data, repeatable separate SQLite test data.
- Docker Compose runs Next.js hot-reload development and Keycloak; no production setup or deployment.
- Playwright tests cover SSO, role restrictions, multi-step forms, conflicts, CRUD and persistence.

## Architecture and constraints

Browser uses Next.js at localhost:3000, with Keycloak proxied through `/idp` to the separate Compose service. The OIDC issuer is thus the same URL from browser and server without OS host-file changes. Next.js reads/writes SQLite on a persistent mounted directory; SQLite needs no container. Auth and authorization are enforced on the server. No real payments, email, cloud storage or production deployment. App must document how to seed and reset test data.

## Approach

Selected a focused booking system rather than a broader commerce admin or task board, maximizing test flows while keeping four main screens. Selected local Compose for reproducibility rather than managed hosting. Both Keycloak and application data are demo-only.
