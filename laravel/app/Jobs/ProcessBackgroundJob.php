<?php

namespace App\Jobs;

use App\Models\BackgroundJob;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use RuntimeException;
use Throwable;

class ProcessBackgroundJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;
    public int $timeout = 30;

    public function __construct(public int $backgroundJobId) {}

    public function backoff(): array { return [1, 2]; }

    public function handle(): void
    {
        $job = BackgroundJob::find($this->backgroundJobId);
        if (!$job || $job->status === 'COMPLETED' || $job->status === 'FAILED') {
            return;
        }

        $job->update(['status' => 'PROCESSING', 'attempts' => $this->attempts(), 'last_error' => null]);
        try {
            if ($job->type === 'DEMO') {
                if ($this->attempts() <= $job->fail_until_attempt) {
                    throw new RuntimeException('Simulated queue failure');
                }
                $result = 'Demo job completed';
            } elseif ($job->type === 'BOOKING_CONFIRMATION') {
                $booking = $job->booking()->with('customer')->first();
                if (!$booking) {
                    throw new RuntimeException('Booking for confirmation not found');
                }
                $result = $booking->status === 'CANCELED'
                    ? 'Skipped: booking canceled'
                    : "Confirmation recorded for {$booking->reference} ({$booking->customer->email})";
            } else {
                throw new RuntimeException('Unknown job type: '.$job->type);
            }
            // Simulated only. No real email or external side effect.
            $job->update(['status' => 'COMPLETED', 'result' => $result, 'completed_at' => now(), 'last_error' => null]);
        } catch (Throwable $exception) {
            $job->update(['status' => 'PENDING', 'last_error' => $exception->getMessage()]);
            throw $exception;
        }
    }

    public function failed(?Throwable $exception): void
    {
        BackgroundJob::whereKey($this->backgroundJobId)->where('status', '!=', 'COMPLETED')->update([
            'status' => 'FAILED',
            'last_error' => $exception?->getMessage() ?? 'Job failed',
        ]);
    }
}
