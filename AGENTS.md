# web-example — local Next.js + Laravel monorepo

- `nextjs/`: Next.js 16 frontend, Keycloak/NextAuth, server-side signed BFF, Playwright, component tests.
- `laravel/`: Laravel 13 + FrankenPHP REST API, DDD Domain/Application/Infrastructure modules, Eloquent MySQL, Redis-backed cache and persistent Laravel database queue.
- `docker-compose.yml`: Next.js, FrankenPHP, MySQL 8.4, Redis 7.4, queue worker, Keycloak.

Every reusable Next.js component should have a colocated `*.test.tsx` file. Keep page components small; use `src/components/page-parts/` for reusable sections.

Business rules belong to Laravel `Domain`; orchestration belongs to `Application`; persistence implementations belong to `Infrastructure`. Keep controllers focused on authentication, validation, and delegating to use cases.

Frontend code must not access MySQL, Redis, Eloquent or Laravel internal state directly. The Next.js BFF uses Keycloak session validation and HMAC-signed server-to-server requests. Never trust client-supplied roles or forward signing headers from browsers.

Local demo secrets are not suitable for public deployment. `INTERNAL_API_SECRET` remains server-only.

Before editing Next.js, read the installed Next.js 16 docs in `nextjs/node_modules/next/dist/docs`.

CI runs frontend unit/components, Next.js build, Laravel domain unit, Laravel feature and Playwright E2E in parallel. E2E may only reset a database whose name ends with `_test`.
