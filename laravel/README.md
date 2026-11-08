# Laravel Backend — Domain-driven structure

## Stack

- PHP 8.4 + Laravel 13, HTTP served by FrankenPHP
- MySQL 8.4 (Eloquent persistence)
- Redis 7.4 (Laravel cache; `CACHE_STORE=redis`)
- Laravel database queue (jobs persisted in MySQL); separate worker process

## Layers

```text
app/
├── Domain/
│   ├── Bookings/
│   │   ├── BookingPolicy.php
│   │   └── Contracts/BookingRepository.php
│   └── Queue/DemoScenario.php
├── Application/
│   ├── Bookings/CreateBooking.php
│   └── Queue/EnqueueDemoJob.php
├── Infrastructure/Persistence/EloquentBookingRepository.php
├── Http/Controllers/ApiController.php
├── Http/Middleware/VerifyFrontendSignature.php
├── Jobs/ProcessBackgroundJob.php
└── Models/                 Eloquent persistence records
```

The Domain layer contains framework-independent rules and contracts. Application use cases orchestrate use and depend on interfaces. Infrastructure implements storage and dispatch. HTTP entrypoints validate input and delegate. The original API JSON contract is preserved to keep the Next.js UI and Playwright fixtures compatible.

Run from repository root: `docker compose up -d --build`.

To run tests **without touching the local development database**:

```bash
DB_DATABASE=web_example_test docker compose up -d --build
docker compose exec -T laravel php artisan test
```

Do not reuse the development MySQL volume for live data or deploy the demo credentials. The API requires a signed request from the Next.js BFF.
