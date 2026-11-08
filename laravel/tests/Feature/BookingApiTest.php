<?php

namespace Tests\Feature;

use App\Models\BackgroundJob;
use App\Models\Service;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class BookingApiTest extends TestCase
{
    use RefreshDatabase;

    private const SECRET = 'local-booking-shared-secret-change-before-sharing';

    private function signedRequest(
        string $method, string $path, string $body = '', string $role = 'admin'
    ): TestResponse {
        $timestamp = (string) time();
        $email = $role.'@bookly.local';
        $message = implode("\n", [
            $timestamp, $method, $path, hash('sha256', $body), $email, $role,
        ]);
        $server = [
            'HTTP_ACCEPT' => 'application/json',
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_FRONTEND_TIMESTAMP' => $timestamp,
            'HTTP_X_FRONTEND_IDENTITY' => $email,
            'HTTP_X_FRONTEND_ROLE' => $role,
            'HTTP_X_FRONTEND_SIGNATURE' => hash_hmac('sha256', $message, self::SECRET),
        ];
        return $this->call($method, $path, [], [], [], $server, $body);
    }

    public function test_rejects_anonymous_requests_and_invalid_signatures(): void
    {
        $this->getJson('/api/services')->assertUnauthorized();
        $this->call('GET', '/api/services', [], [], [], [
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_X_FRONTEND_TIMESTAMP' => (string) time(),
            'HTTP_X_FRONTEND_IDENTITY' => 'admin@bookly.local',
            'HTTP_X_FRONTEND_ROLE' => 'admin',
            'HTTP_X_FRONTEND_SIGNATURE' => str_repeat('a', 64),
        ])->assertUnauthorized();
    }

    public function test_protects_admin_mutations_and_lists_services(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->signedRequest('GET', '/api/services')->assertOk()->assertJsonCount(6, 'items');
        $this->signedRequest('POST', '/api/services', '{}', 'staff')->assertForbidden();
        $this->signedRequest('GET', '/api/services?search=Personal%20consultation')
            ->assertOk()->assertJsonCount(1, 'items');
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
        $this->signedRequest('POST', '/api/bookings', $body)
            ->assertCreated()
            ->assertJsonPath('customer.email', 'booking@example.com')
            ->assertJsonPath('status', 'CONFIRMED');
        $this->assertDatabaseCount('background_jobs', 1);
        $this->assertSame('PENDING', BackgroundJob::firstOrFail()->status);
        $this->signedRequest('POST', '/api/bookings', $body)->assertStatus(409);
    }

    public function test_only_admin_can_manage_demo_queue(): void
    {
        $body = '{"scenario":"success"}';
        $this->signedRequest('POST', '/api/queue', $body, 'staff')->assertForbidden();
        $this->signedRequest('POST', '/api/queue', $body)
            ->assertCreated()->assertJsonPath('status', 'PENDING');
        $this->assertDatabaseCount('background_jobs', 1);
    }
}
