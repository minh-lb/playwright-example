<?php

namespace App\Domain\Bookings\Contracts;

interface BookingRepository
{
    /** Persist booking, customer, and notification queue atomically; return new booking ID. */
    public function create(array $attributes, string $createdBy): int;
}
