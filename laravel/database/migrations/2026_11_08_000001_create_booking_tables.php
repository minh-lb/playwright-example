<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('services', function (Blueprint $table): void {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->text('description');
            $table->string('category');
            $table->unsignedInteger('duration_minutes');
            $table->unsignedInteger('price');
            $table->string('color')->default('indigo');
            $table->boolean('active')->default(true);
            $table->timestamps();
        });
        Schema::create('customers', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('phone');
            $table->timestamps();
        });
        Schema::create('bookings', function (Blueprint $table): void {
            $table->id();
            $table->string('reference')->unique();
            $table->foreignId('service_id')->constrained();
            $table->foreignId('customer_id')->constrained();
            $table->string('date');
            $table->string('time_slot');
            $table->string('status')->default('CONFIRMED');
            $table->text('notes');
            $table->string('created_by');
            $table->timestamps();
            $table->index(['service_id', 'date', 'time_slot']);
            $table->index(['status', 'date']);
        });
        Schema::create('background_jobs', function (Blueprint $table): void {
            $table->id();
            $table->string('type')->default('DEMO');
            $table->foreignId('booking_id')->nullable()->unique()->constrained('bookings')->cascadeOnDelete();
            $table->string('status')->default('PENDING');
            $table->unsignedInteger('attempts')->default(0);
            $table->unsignedInteger('max_attempts')->default(3);
            $table->unsignedInteger('fail_until_attempt')->default(0);
            $table->text('last_error')->nullable();
            $table->text('result')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('background_jobs');
        Schema::dropIfExists('bookings');
        Schema::dropIfExists('customers');
        Schema::dropIfExists('services');
    }
};
