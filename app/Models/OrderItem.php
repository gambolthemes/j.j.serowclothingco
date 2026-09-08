<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id', 'product_name', 'color_name', 'ratio',
        'sets', 'private_label', 'sample', 'per_set_price', 'line_total',
    ];

    protected function casts(): array
    {
        return [
            'ratio' => 'array',
            'private_label' => 'boolean',
            'sample' => 'boolean',
            'per_set_price' => 'decimal:2',
            'line_total' => 'decimal:2',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
