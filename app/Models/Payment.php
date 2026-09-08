<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    public const CREATED = 'created';

    public const PAID = 'paid';

    public const FAILED = 'failed';

    protected $fillable = [
        'gateway', 'gateway_order_id', 'gateway_payment_id', 'status',
        'amount', 'currency', 'amount_inr', 'fx_rate', 'raw', 'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'amount_inr' => 'decimal:2',
            'fx_rate' => 'decimal:4',
            'raw' => 'array',
            'paid_at' => 'datetime',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function isPaid(): bool
    {
        return $this->status === self::PAID;
    }

    /**
     * What the account and admin screens show. `raw` is deliberately absent —
     * it is a gateway dump kept for disputes, not something to render.
     *
     * @return array<string, mixed>
     */
    public function payload(): array
    {
        return [
            'id' => $this->id,
            'gateway' => $this->gateway,
            'status' => $this->status,
            'amount' => (float) $this->amount,
            'currency' => $this->currency,
            'amount_inr' => (float) $this->amount_inr,
            'fx_rate' => $this->fx_rate === null ? null : (float) $this->fx_rate,
            'reference' => $this->gateway_payment_id,
            'paid_at' => $this->paid_at?->toIso8601String(),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
