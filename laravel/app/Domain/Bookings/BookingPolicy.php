<?php

namespace App\Domain\Bookings;

final class BookingPolicy
{
    public const TIMES = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

    public static function canTransition(string $current, string $next): bool
    {
        if (!in_array($next, ['CONFIRMED', 'COMPLETED', 'CANCELED'], true)) {
            return false;
        }
        return $current === $next || ($current === 'CONFIRMED' && in_array($next, ['COMPLETED', 'CANCELED'], true));
    }
}
