<?php

namespace App\Infrastructure\Persistence;

use App\Domain\Bookings\Contracts\BookingRepository;
use App\Jobs\ProcessBackgroundJob;
use App\Models\BackgroundJob;
use App\Models\Booking;
use App\Models\Customer;
use App\Models\Service;
use Illuminate\Support\Facades\DB;

final class EloquentBookingRepository implements BookingRepository
{
    public function create(array $data, string $createdBy): int
    {
        return DB::transaction(function () use ($data, $createdBy): int {
            $service = Service::find($data['serviceId']);
            if (!$service || !$service->active) {
                throw new \DomainException('The selected service is unavailable.');
            }
            if (Booking::where('service_id', $service->id)
                ->where('date', $data['date'])
                ->where('time_slot', $data['timeSlot'])
                ->where('status', '!=', 'CANCELED')->exists()) {
                throw new \LogicException('This time is already booked. Choose another slot.');
            }

            $customer = Customer::updateOrCreate(
                ['email' => $data['customerEmail']],
                ['name' => $data['customerName'], 'phone' => $data['customerPhone']]
            );
            $booking = Booking::create([
                'reference' => 'BK-'.strtoupper(bin2hex(random_bytes(4))),
                'status' => 'CONFIRMED',
                'service_id' => $service->id, 'customer_id' => $customer->id,
                'date' => $data['date'], 'time_slot' => $data['timeSlot'],
                'notes' => $data['notes'] ?? '', 'created_by' => $createdBy,
            ]);
            $job = BackgroundJob::create([
                'type' => 'BOOKING_CONFIRMATION',
                'booking_id' => $booking->id,
                'status' => 'PENDING',
                'attempts' => 0,
                'max_attempts' => 3,
                'fail_until_attempt' => 0,
            ]);

            // Both the booking row and the database queue record commit together.
            ProcessBackgroundJob::dispatch($job->id);
            return (int) $booking->id;
        });
    }
}
