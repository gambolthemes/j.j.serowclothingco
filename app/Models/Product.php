<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Product extends Model
{
    use HasFactory;

    /** Stock states a product/colour pair can be in. */
    public const STOCK_STATES = ['in_stock', 'made_to_order', 'out_of_stock'];

    protected $fillable = [
        'slug', 'name', 'category', 'fabric', 'image',
        'price_mod', 'blurb', 'is_active', 'position',
    ];

    protected function casts(): array
    {
        return [
            'price_mod' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function colors(): BelongsToMany
    {
        return $this->belongsToMany(Color::class, 'product_color_stock')
            ->withPivot('status')
            ->withTimestamps();
    }

    /**
     * The shape data/products.js exports as PRODUCTS — `id` is the slug because
     * that is what order_items already store and what the routes use.
     */
    public function toStorefront(): array
    {
        return [
            'id' => $this->slug,
            'name' => $this->name,
            'category' => $this->category,
            'fabric' => $this->fabric,
            'image' => $this->image,
            'priceMod' => (float) $this->price_mod,
            'blurb' => $this->blurb,
            'stock' => $this->colors->mapWithKeys(
                fn (Color $color) => [$color->name => $color->pivot->status]
            )->all(),
        ];
    }
}
