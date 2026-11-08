<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BackgroundJob extends Model
{
    protected $fillable = ['type', 'booking_id', 'status', 'attempts', 'max_attempts', 'fail_until_attempt', 'last_error', 'result', 'completed_at'];
    protected $casts = ['attempts' => 'integer', 'max_attempts' => 'integer', 'fail_until_attempt' => 'integer', 'completed_at' => 'datetime'];
    public function booking(): BelongsTo { return $this->belongsTo(Booking::class); }
}
