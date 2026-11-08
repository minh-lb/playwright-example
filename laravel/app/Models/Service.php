<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Service extends Model
{
    protected $fillable = ['slug', 'name', 'description', 'category', 'duration_minutes', 'price', 'color', 'active'];
    protected $casts = ['active' => 'boolean', 'price' => 'integer', 'duration_minutes' => 'integer'];
    public function bookings(): HasMany { return $this->hasMany(Booking::class); }
}
