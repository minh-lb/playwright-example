<?php

namespace App\Application\Bookings;

use App\Domain\Bookings\Contracts\BookingRepository;

final readonly class CreateBooking
{
    public function __construct(private BookingRepository $repository) {}

    public function handle(array $validated, string $actorEmail): int
    {
        return $this->repository->create($validated, $actorEmail);
    }
}
