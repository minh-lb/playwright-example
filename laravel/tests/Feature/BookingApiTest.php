<?php

namespace Tests\Feature;

use App\Models\BackgroundJob;
use App\Models\Service;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingApiTest extends TestCase
{
    use RefreshDatabase;

    private const SECRET = 'local-booking-shared-secret-change-before-sharing';

    private function signed(string $method, string $path, string $body = '', string $role = 'admin'): array
    {
        $timestamp = (string) time();
        $email = $role.'@bookly.local';
        $message = implode("\n", [$timestamp, $method, $path, hash('sha256', $body), $email, $role]);
        return [
            'X-Frontend-Timestamp' => $timestamp,
            'X-Frontend-Identity' => $email,
            'X-Frontend-Role' => $role,
            'X-Frontend-Signature' => hash_hmac('sha256', $message, self::SECRET),
        ];
    }

    public function test_rejects_unauthenticated_requests_and_invalid_signatures(): void
    {
        $this->getJson('/api/services')->assertUnauthorized();
        $this->withHeaders([
            'X-Frontend-Timestamp' => (string) time(),
            'X-Frontend-Identity' => 'admin@bookly.local',
            'X-Frontend-Role' => 'admin',
            'X-Frontend-Signature' => str_repeat('a', 64),
        ])->getJson('/api/services')->assertUnauthorized();
    }

    public function test_protects_admin_mutations_and_lists_services(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->withHeaders($this->signed('GET', '/api/services'))
            ->getJson('/api/services')->assertOk()->assertJsonCount(6, 'items');
        $this->withHeaders($this->signed('POST', '/api/services', '{}', 'staff'))
            ->call('POST', '/api/services', [], [], [], ['CONTENT_TYPE' => 'application/json'], '{}')
            ->assertForbidden();
    }

    public function test_booking_enqueues_a_confirmation_and_rejects_a_slot_conflict(): void
    {
        $this->seed(DatabaseSeeder::class);
        $service = Service::where('slug', 'consultation')->firstOrFail();
        $data = [
            'serviceId' => $service->id,
            'date' => now()->addDays(30)->toDateString(),
            'timeSlot' => '17:00',
            'customerName' => 'Test Customer',
            'customerEmail' => 'booking@example.com',
            'customerPhone' => '0901234567',
            'notes' => '',
        ];
        $body = json_encode($data);
        $this->withHeaders($this->signed('POST', '/api/bookings', $body));
        $response = $this->call('POST', '/api/bookings', [], [], [], ['CONTENT_TYPE' => 'application/json'], $body);
        $response->assertCreated()->assertJsonPath('customer.email', 'booking@example.com');
        $this->assertDatabaseCount('background_jobs', 1);
        $this->assertSame('PENDING', BackgroundJob::firstOrFail()->status);
        $this->call('POST', '/api/bookings', [], [], [], ['CONTENT_TYPE' => 'application/json'], $body)
            ->assertStatus(409);
    }

    public function test_only_admin_can_manage_demo_queue(): void
    {
        $body = '{"scenario":"success"}';
        $this->withHeaders($this->signed('POST', '/api/queue', $body, 'staff'))
            ->call('POST', '/api/queue', [], [], [], ['CONTENT_TYPE' => 'application/json'], $body)
            ->assertForbidden();
        $this->withHeaders($this->signed('POST', '/api/queue', $body))
            ->call('POST', '/api/queue', [], [], [], ['CONTENT_TYPE' => 'application/json'], $body)
            ->assertCreated()->assertJsonPath('status', 'PENDING');
        $this->assertDatabaseCount('background_jobs', 1);
    }
}
