<?php

use App\Models\BackgroundJob;
use App\Models\Booking;
use App\Models\Customer;
use App\Models\Service;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

Artisan::command('booking:reset-demo', function () {
    if (!str_ends_with((string) config('database.connections.'.config('database.default').'.database'), '_test') && !str_contains((string) config('database.connections.'.config('database.default').'.database'), 'test.sqlite')) {
        throw new RuntimeException('Refusing to reset a database other than isolated test database');
    }
    DB::table('jobs')->delete();
    BackgroundJob::query()->delete();
    Booking::query()->delete();
    Customer::query()->delete();
    Service::query()->delete();
    $this->call('db:seed', ['--force' => true]);
    $this->info('Demo booking and queue fixtures reset.');
})->purpose('Reset the isolated Playwright fixtures');

Artisan::command('booking:queue-fixtures {action} {--ids=}', function () {
    if (!str_contains((string) config('database.connections.sqlite.database'), 'test.sqlite')) {
        throw new RuntimeException('Queue fixtures require isolated test database');
    }
    $action = $this->argument('action');
    if ($action === 'seed') {
        $marker = 'queue-pagination-'.Str::uuid();
        for ($i = 0; $i < 102; $i++) {
            BackgroundJob::create([
                'type' => 'DEMO', 'status' => 'FAILED', 'attempts' => 3,
                'fail_until_attempt' => 3, 'last_error' => $marker,
            ]);
        }
        $ids = BackgroundJob::where('last_error', $marker)->orderBy('id')->pluck('id')->all();
        $this->line(json_encode($ids));
        return;
    }
    if ($action === 'cleanup') {
        $ids = array_values(array_filter(array_map('intval', explode(',', (string) $this->option('ids')))));
        if (!$ids) throw new RuntimeException('Missing fixture IDs');
        BackgroundJob::whereIn('id', $ids)->delete();
        return;
    }
    throw new RuntimeException('Unknown fixture action');
})->purpose('Create or remove failed queue jobs for pagination E2E');
