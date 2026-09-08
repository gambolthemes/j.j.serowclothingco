<?php

namespace App\Support;

use App\Models\Color;
use App\Models\Product;
use App\Models\Setting;

/**
 * The catalog and commercial terms the storefront needs, in exactly the shape
 * resources/js/data/products.js and lib/pricing.js used to hardcode. It is
 * printed into the page by the app shell rather than fetched, so the first
 * paint has the catalog and no screen needs a loading state for it.
 */
class Storefront
{
    /**
     * @return array<string, mixed>
     */
    public static function payload(): array
    {
        return [
            'products' => Product::with(['colors' => fn ($q) => $q->orderBy('position')])
                ->where('is_active', true)
                ->orderBy('position')
                ->get()
                ->map(fn (Product $product) => $product->toStorefront())
                ->all(),
            'colors' => Color::orderBy('position')
                ->get()
                ->map(fn (Color $color) => $color->toStorefront())
                ->all(),
            // storefrontValues(), not values(): this payload is printed into the
            // page for guests as well, and the company's own bank details are
            // not for the public page source.
            'settings' => Setting::storefrontValues(),
        ];
    }
}
