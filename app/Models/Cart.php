<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A retailer's draft cart. Deliberately dumb storage: no prices are kept here,
 * because the only prices that count are the ones App\Support\Pricing works out
 * from the catalog at checkout. Whatever a client pushes up is a shopping list,
 * not a quote.
 */
class Cart extends Model
{
    protected $fillable = ['user_id', 'items'];

    protected function casts(): array
    {
        return ['items' => 'array'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
