<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\Customer;
use App\Models\Service;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $services = [
            ['consultation', 'Personal consultation', 'A focused one-to-one strategy session tailored to your goals.', 'Consultation', 60, 350000, 'indigo'],
            ['wellness', 'Wellness session', 'Recharge with a guided mindfulness and wellbeing session.', 'Wellness', 90, 490000, 'rose'],
            ['career', 'Career coaching', 'Find clarity on your next career move with an experienced coach.', 'Coaching', 60, 420000, 'amber'],
            ['design', 'Design review', 'Walk through your product design with practical feedback.', 'Consultation', 45, 280000, 'cyan'],
            ['fitness', 'Fitness assessment', 'Baseline assessment and a personalized training plan.', 'Wellness', 45, 300000, 'emerald'],
            ['nutrition', 'Nutrition planning', 'A realistic nutrition plan based on your schedule.', 'Wellness', 60, 390000, 'violet'],
        ];
        $created = [];
        foreach ($services as [$slug, $name, $description, $category, $duration, $price, $color]) {
            $created[] = Service::updateOrCreate(['slug' => $slug], [
                'name' => $name, 'description' => $description,
                'category' => $category, 'duration_minutes' => $duration,
                'price' => $price, 'color' => $color, 'active' => true,
            ]);
        }

        $customers = [
            ['Sophia Nguyen', 'sophia@example.com', '0901123456'],
            ['Daniel Tran', 'daniel@example.com', '0902234567'],
            ['Emma Le', 'emma@example.com', '0903345678'],
            ['Oliver Pham', 'oliver@example.com', '0904456789'],
        ];
        $saved = [];
        foreach ($customers as [$name, $email, $phone]) {
            $saved[] = Customer::updateOrCreate(['email' => $email], compact('name', 'phone'));
        }

        for ($i = 0; $i < 8; $i++) {
            Booking::firstOrCreate(['reference' => sprintf('DEMO-%03d', $i + 1)], [
                'service_id' => $created[$i % count($created)]->id,
                'customer_id' => $saved[$i % count($saved)]->id,
                'date' => now()->addDays(1 + intdiv($i, 3))->toDateString(),
                'time_slot' => ['09:00', '10:00', '14:00'][$i % 3],
                'status' => $i === 4 ? 'COMPLETED' : ($i === 7 ? 'CANCELED' : 'CONFIRMED'),
                'notes' => $i === 0 ? 'First-time guest' : '',
                'created_by' => 'demo-seed',
            ]);
        }
    }
}
