<?php

use App\Http\Controllers\ApiController;
use Illuminate\Support\Facades\Route;

Route::get('/health', [ApiController::class, 'health']);

Route::middleware('frontend')->group(function (): void {
    Route::get('/dashboard', [ApiController::class, 'dashboard']);
    Route::get('/services', [ApiController::class, 'services']);
    Route::post('/services', [ApiController::class, 'createService']);
    Route::patch('/services/{id}', [ApiController::class, 'updateService']);
    Route::delete('/services/{id}', [ApiController::class, 'archiveService']);
    Route::get('/bookings', [ApiController::class, 'bookings']);
    Route::post('/bookings', [ApiController::class, 'createBooking']);
    Route::patch('/bookings/{id}', [ApiController::class, 'changeBooking']);
    Route::get('/availability', [ApiController::class, 'availability']);
    Route::get('/queue', [ApiController::class, 'queue']);
    Route::post('/queue', [ApiController::class, 'createDemoJob']);
    Route::patch('/queue/{id}', [ApiController::class, 'retryJob']);
});
