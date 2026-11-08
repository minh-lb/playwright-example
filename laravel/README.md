# Booking API (Laravel + FrankenPHP)

Laravel 13, Eloquent SQLite and Laravel database queue replace the old Next.js Prisma backend.

- HTTP: FrankenPHP on port 80 in Compose, available on host at http://localhost:8000.
- Worker: separate `queue-worker` service running `php artisan queue:work`.
- Authentication: the Next.js BFF validates its Keycloak/NextAuth session and signs forwarded identity headers. Direct access to protected backend endpoints without a valid HMAC signature is rejected.
- Queue: `background_jobs` tracks demo/booking outcomes; Laravel's `jobs` table persists scheduled workers.

Start from repository root: `docker compose up -d --build`.

To run tests in the application container:
`docker compose exec laravel php artisan test`

The backend is for local testing. Do not expose the internal HMAC secret publicly or reuse its example value in shared environments.
