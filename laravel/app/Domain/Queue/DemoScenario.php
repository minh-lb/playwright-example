<?php

namespace App\Domain\Queue;

final class DemoScenario
{
    public static function failUntilAttempt(string $scenario): int
    {
        return match ($scenario) {
            'success' => 0,
            'retry' => 2,
            'fail' => 3,
            default => throw new \InvalidArgumentException('Invalid demo scenario'),
        };
    }
}
