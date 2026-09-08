<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    use HasFactory;

    /** Every status an order can hold, mapped to its display label. */
    public const STATUSES = [
        'placed' => 'Order Placed',
        'payment_received' => 'Payment Received',
        'cutting' => 'Cutting',
        'stitching' => 'Stitching',
        'qc' => 'QC',
        'dispatch' => 'Dispatch',
        'delivered' => 'Delivered',
        'cancelled' => 'Cancelled',
    ];

    /**
     * The production stages /tracking draws, in order. "cancelled" is
     * deliberately absent — it leaves the timeline rather than advancing it.
     */
    public const TIMELINE = [
        'placed', 'payment_received', 'cutting', 'stitching', 'qc', 'dispatch', 'delivered',
    ];

    protected $fillable = [
        'code', 'status', 'total_sets', 'subtotal', 'gst', 'total',
        'shipping_address', 'billing_profile', 'notes', 'placed_at',
    ];

    protected function casts(): array
    {
        return [
            'shipping_address' => 'array',
            'billing_profile' => 'array',
            'subtotal' => 'decimal:2',
            'gst' => 'decimal:2',
            'total' => 'decimal:2',
            'placed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function statusEvents(): HasMany
    {
        return $this->hasMany(OrderStatusEvent::class)->orderByDesc('created_at');
    }

    public function statusLabel(): string
    {
        return self::STATUSES[$this->status] ?? $this->status;
    }

    /**
     * Position on the production timeline, or null for an order that is not on
     * it at all (cancelled, or a status we do not draw).
     */
    public function stageIndex(): ?int
    {
        $index = array_search($this->status, self::TIMELINE, true);

        return $index === false ? null : $index;
    }
}
