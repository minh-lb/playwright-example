<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Booking extends Model
{
    protected $fillable = ['reference', 'service_id', 'customer_id', 'date', 'time_slot', 'status', 'notes', 'created_by'];
    public function service(): BelongsTo { return $this->belongsTo(Service::class); }
    public function customer(): BelongsTo { return $this->belongsTo(Customer::class); }
}
