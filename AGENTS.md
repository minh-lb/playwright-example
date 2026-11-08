# Booking demo monorepo

- `nextjs/`: Next.js 16 UI, Keycloak/NextAuth authentication, server-side signed BFF proxy and Playwright tests.
- `laravel/`: Laravel 13 REST API, Eloquent SQLite and Laravel database queue.
- `docker-compose.yml`: Keycloak, Next.js, FrankenPHP, Laravel queue worker.

Frontend code must not access SQLite, Prisma or Laravel models directly. Keep backend data access, validation, business rules and worker code in `laravel/`.

Never forward client-supplied role or internal signing headers to Laravel. Only the Next.js server may produce HMAC-signed identity headers after validating a Keycloak session.

The shared secret is only for local development. Keep `INTERNAL_API_SECRET` server-only.

When editing Next.js, read the installed Next.js 16 documentation at `nextjs/node_modules/next/dist/docs` before making API changes.
