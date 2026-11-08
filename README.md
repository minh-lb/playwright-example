# web-example

A local Playwright learning project built as a single monorepo.

```text
web-example/
├── nextjs/                  Next.js frontend, Keycloak BFF, Playwright, component tests
├── laravel/                 Laravel API, DDD layers and persistent background queue
├── docker-compose.yml       Next.js, FrankenPHP, MySQL, Redis, queue worker, Keycloak
└── .github/workflows/       Parallel CI
```

Start the local stack:

```sh
docker compose up -d --build
docker compose ps
```

- UI: http://localhost:3000
- Backend health: http://localhost:8000/api/health
- Keycloak: http://localhost:8080/idp
- Job queue dashboard: http://localhost:3000/queue (admin only)

Local demo credentials: admin / Admin123!, staff / Staff123!.

**Data storage:** MySQL 8.4 (`mysql-data` Docker volume). **Cache:** Redis 7.4 (`redis-data`). **Queue:** Laravel database queue in MySQL, processed by an independent `queue-worker`. Next.js uses NextAuth/Keycloak and signs internal Laravel calls; no browser-held backend credential.

```sh
cd nextjs && npm ci && npm run test:unit && npm run typecheck
cd ..
DB_DATABASE=web_example_test docker compose up -d --build
docker compose exec -T laravel php artisan test
cd nextjs && npm run test:e2e
```

Playwright global setup is guarded to run only against a database ending in `_test`, and resets seeded test fixtures after stopping the worker. The CI workflow separates Next.js unit/component, Next.js build, Laravel unit, Laravel feature and Playwright tests across independent concurrent jobs.

**Migration note:** old Prisma/SQLite data is not automatically migrated. Use an explicit export/import if you need those records. This stack is configured for local development, not production security. Configure secrets before sharing.

## Repository rename

The GitHub repository is currently named `playwright-example`. To rename it to `web-example`, use **GitHub → Settings → General → Repository name**. The GitHub connector available in this session does not offer a rename operation.
