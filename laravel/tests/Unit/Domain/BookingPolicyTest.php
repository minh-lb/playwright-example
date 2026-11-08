<?php

namespace Tests\Unit\Domain;

use App\Domain\Bookings\BookingPolicy;
use App\Domain\Queue\DemoScenario;
use PHPUnit\Framework\TestCase;

class BookingPolicyTest extends TestCase
{
    public function test_status_changes_follow_domain_policy(): void
    {
        $this->assertTrue(BookingPolicy::canTransition('CONFIRMED', 'CANCELED'));
        $this->assertTrue(BookingPolicy::canTransition('CONFIRMED', 'COMPLETED'));
        $this->assertFalse(BookingPolicy::canTransition('CANCELED', 'COMPLETED'));
        $this->assertFalse(BookingPolicy::canTransition('COMPLETED', 'CONFIRMED'));
        $this->assertFalse(BookingPolicy::canTransition('CONFIRMED', 'PENDING'));
    }

    public function test_demo_scenarios_map_to_failure_counts(): void
    {
        $this->assertSame(0, DemoScenario::failUntilAttempt('success'));
        $this->assertSame(2, DemoScenario::failUntilAttempt('retry'));
        $this->assertSame(3, DemoScenario::failUntilAttempt('fail'));
    }
}
