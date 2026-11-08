<?php

namespace App\Application\Queue;

use App\Domain\Queue\DemoScenario;
use App\Jobs\ProcessBackgroundJob;
use App\Models\BackgroundJob;
use Illuminate\Support\Facades\DB;

final class EnqueueDemoJob
{
    public function handle(string $scenario): BackgroundJob
    {
        return DB::transaction(function () use ($scenario): BackgroundJob {
            $job = BackgroundJob::create([
                'type' => 'DEMO',
                'status' => 'PENDING',
                'attempts' => 0,
                'max_attempts' => 3,
                'fail_until_attempt' => DemoScenario::failUntilAttempt($scenario),
            ]);
            ProcessBackgroundJob::dispatch($job->id);
            return $job;
        });
    }
}
