# Playwright Booking — Next.js + Laravel + FrankenPHP

Local-only booking application for Playwright E2E learning, split into frontend and backend folders.

```text
.
├── nextjs/              Next.js UI, Keycloak/NextAuth session, BFF API proxy, Playwright
├── laravel/             Laravel 13 REST API, Eloquent SQLite, database queue
└── docker-compose.yml  Next.js, FrankenPHP, queue worker, Keycloak
```

## Start

```bash
docker compose up -d --build
docker compose ps
```

- Frontend: http://localhost:3000
- Laravel / FrankenPHP health: http://localhost:8000/api/health
- Keycloak: http://localhost:8080/idp
- Queue dashboard: http://localhost:3000/queue (admin)

Demo users: `admin / Admin123!` and `staff / Staff123!`.

The web browser only talks to Next.js. Next.js validates Keycloak sessions, then signs internal Laravel requests with `INTERNAL_API_SECRET` and a 60-second timestamp. Laravel rejects invalid signatures, and enforces the Admin role for service/queue mutations. **Do not expose the internal secret in NEXT_PUBLIC_ variables.**

Laravel uses a dedicated SQLite file in a Docker volume (`laravel-storage`). Each booking and its confirmation job are persisted together; an independent `queue-worker` consumes jobs via the native Laravel database queue. Notification results are simulated, no email is sent.

```bash
docker compose logs -f nextjs laravel queue-worker keycloak
docker compose exec laravel php artisan migrate --force
docker compose exec laravel php artisan test
docker compose down
```

## E2E on isolated test database

```bash
docker compose down
DATABASE_FILE=test.sqlite docker compose up -d --build
cd nextjs
npm ci
npx playwright install chromium
npm run test:e2e
```

The Playwright global setup checks Laravel health is reporting `test`, stops the queue worker, resets demo data through Laravel Artisan, then restarts the worker. Only the test SQLite database should be reset.

To return to development data:
```bash
docker compose down
docker compose up -d
```

The original Node/Prisma SQLite database is not migrated automatically. New Laravel SQLite data is independent; export/migrate existing data explicitly if needed.

## Commands

```bash
cd nextjs && npm run test:unit && npm run typecheck
docker compose exec -T laravel php artisan test
```
