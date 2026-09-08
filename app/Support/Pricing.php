<?php

namespace App\Support;

use App\Models\Color;
use App\Models\Product;
use App\Models\Setting;

/**
 * The wholesale price rules, server-side. This is a deliberate mirror of
 * resources/js/lib/pricing.js — the browser computes the same numbers to show
 * them, but what gets stored on an order is only ever what is computed here.
 */
class Pricing
{
    /** Per-set price for a colourway before any discount. */
    public static function colorBase(Product $product, Color $color): float
    {
        return (float) $color->base + (float) $product->price_mod;
    }

    /** @param array<string, int> $ratio */
    public static function piecesPerSet(array $ratio): int
    {
        return (int) array_sum(array_map('intval', $ratio));
    }

    /**
     * The tier a set count falls into. A tier with a null `max` is open-ended.
     *
     * @return array<string, mixed>
     */
    public static function tierFor(int $sets): array
    {
        $tiers = Setting::get('TIERS');

        foreach ($tiers as $tier) {
            $max = $tier['max'] ?? null;

            if ($sets >= $tier['min'] && ($max === null || $sets <= $max)) {
                return $tier;
            }
        }

        return $tiers[0];
    }

    public static function discountedSetBase(float $base, int $sets): float
    {
        return round($base * (1 - (float) self::tierFor($sets)['discount']));
    }

    /**
     * Price for one set. Scales with piece count against the standard set size,
     * plus the private-label charge per piece.
     *
     * @param  array<string, int>  $ratio
     */
    public static function perSetPrice(float $base, int $sets, array $ratio, bool $privateLabel): float
    {
        $pieces = max(self::piecesPerSet($ratio), 1);
        $standard = (int) Setting::get('STANDARD_SET_PIECES');

        $core = round(self::discountedSetBase($base, $sets) * $pieces / $standard);
        $label = $privateLabel ? (float) Setting::get('PRIVATE_LABEL_PER_PC') * $pieces : 0.0;

        return $core + $label;
    }

    /** @param array<string, int> $ratio */
    public static function lineTotal(float $base, int $sets, array $ratio, bool $privateLabel, bool $sample): float
    {
        $total = self::perSetPrice($base, $sets, $ratio, $privateLabel) * $sets;

        return $total + ($sample ? (float) Setting::get('SAMPLE_SET_PRICE') : 0.0);
    }
}
