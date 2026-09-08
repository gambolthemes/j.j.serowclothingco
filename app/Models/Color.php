<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Color extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'hex', 'base', 'position'];

    protected function casts(): array
    {
        return ['base' => 'decimal:2'];
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'product_color_stock')
            ->withPivot('status')
            ->withTimestamps();
    }

    /** The shape data/products.js exports as COLORS. */
    public function toStorefront(): array
    {
        return [
            'name' => $this->name,
            'hex' => $this->hex,
            'base' => (float) $this->base,
        ];
    }
}
