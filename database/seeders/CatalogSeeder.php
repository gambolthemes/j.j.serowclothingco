<?php

namespace Database\Seeders;

use App\Models\Color;
use App\Models\Product;
use Illuminate\Database\Seeder;

/**
 * Lifts the catalog that used to live in resources/js/data/products.js into the
 * database. Idempotent — re-running it updates rather than duplicates, so it is
 * safe to run against an installation that already has orders.
 */
class CatalogSeeder extends Seeder
{
    private const COLORS = [
        ['name' => 'White', 'hex' => '#F2EFE6', 'base' => 3200],
        ['name' => 'Black', 'hex' => '#181611', 'base' => 3250],
        ['name' => 'Stone', 'hex' => '#C7BDA8', 'base' => 3300],
        ['name' => 'Charcoal', 'hex' => '#3B3833', 'base' => 3250],
        ['name' => 'Bone', 'hex' => '#E3DBC5', 'base' => 3280],
    ];

    private const PRODUCTS = [
        [
            'slug' => 'serow-oxford',
            'name' => 'Serow Oxford Shirt',
            'category' => 'shirts',
            'fabric' => '180 GSM Oxford Cotton',
            'image' => 'https://images.hostinger.com/f138934f-8281-4f2e-93d5-7960a62d0aa7.png',
            'price_mod' => 0,
            'blurb' => 'The house staple. Button-down collar, single-needle stitching, pre-washed so retailers sell off the hanger.',
            'stock' => ['White' => 'in_stock', 'Black' => 'in_stock', 'Stone' => 'made_to_order', 'Charcoal' => 'in_stock', 'Bone' => 'made_to_order'],
        ],
        [
            'slug' => 'heavyweight-crew',
            'name' => 'Heavyweight Crew Tee',
            'category' => 'tees',
            'fabric' => '240 GSM Combed Cotton',
            'image' => 'https://images.hostinger.com/3165a7da-ef57-4a68-9033-46d4ef64b2f5.png',
            'price_mod' => -400,
            'blurb' => 'Dense 240 GSM loopwheel-style knit with a ribbed collar that survives fifty washes. Built for repeat customers.',
            'stock' => ['White' => 'in_stock', 'Black' => 'in_stock', 'Stone' => 'in_stock', 'Charcoal' => 'in_stock', 'Bone' => 'made_to_order'],
        ],
        [
            'slug' => 'linen-resort',
            'name' => 'Linen Resort Shirt',
            'category' => 'shirts',
            'fabric' => '160 GSM Cotton-Linen',
            'image' => 'https://images.hostinger.com/90ceacc0-d01f-4f12-b082-865db3071cd4.png',
            'price_mod' => 500,
            'blurb' => 'Airy cotton-linen with a camp collar. The summer rack mover for coastal and resort retailers.',
            'stock' => ['White' => 'in_stock', 'Black' => 'made_to_order', 'Stone' => 'in_stock', 'Charcoal' => 'made_to_order', 'Bone' => 'in_stock'],
        ],
        [
            'slug' => 'serow-polo',
            'name' => 'Serow Pique Polo',
            'category' => 'tees',
            'fabric' => '220 GSM Cotton Pique',
            'image' => 'https://images.hostinger.com/7f04f287-5ce2-465a-b57c-0494908a9a9a.png',
            'price_mod' => 100,
            'blurb' => 'Knitted collar, two-button placket, side vents. Corporate gifting and uniform programs order this by the hundred.',
            'stock' => ['White' => 'in_stock', 'Black' => 'in_stock', 'Stone' => 'made_to_order', 'Charcoal' => 'in_stock', 'Bone' => 'in_stock'],
        ],
        [
            'slug' => 'oversized-drop',
            'name' => 'Oversized Drop Tee',
            'category' => 'tees',
            'fabric' => '220 GSM Terry Cotton',
            'image' => 'https://images.hostinger.com/91f1110a-7e93-453f-b600-0d830169ab1e.png',
            'price_mod' => -200,
            'blurb' => 'Drop shoulder, boxy body, streetwear cut. The one your younger footfall asks for by name.',
            'stock' => ['White' => 'made_to_order', 'Black' => 'in_stock', 'Stone' => 'in_stock', 'Charcoal' => 'in_stock', 'Bone' => 'in_stock'],
        ],
        [
            'slug' => 'chambray-work',
            'name' => 'Chambray Work Shirt',
            'category' => 'shirts',
            'fabric' => '200 GSM Cotton Chambray',
            'image' => 'https://images.hostinger.com/0794f449-b1b7-426f-9414-b807ad77647d.png',
            'price_mod' => 300,
            'blurb' => 'Twin chest pockets, triple-stitched seams, workwear-grade chambray. Ages beautifully on the rack and on the buyer.',
            'stock' => ['White' => 'made_to_order', 'Black' => 'made_to_order', 'Stone' => 'in_stock', 'Charcoal' => 'in_stock', 'Bone' => 'made_to_order'],
        ],
    ];

    public function run(): void
    {
        $colors = [];

        foreach (self::COLORS as $position => $color) {
            $colors[$color['name']] = Color::updateOrCreate(
                ['name' => $color['name']],
                ['hex' => $color['hex'], 'base' => $color['base'], 'position' => $position],
            );
        }

        foreach (self::PRODUCTS as $position => $data) {
            $stock = $data['stock'];
            unset($data['stock']);

            $product = Product::updateOrCreate(
                ['slug' => $data['slug']],
                $data + ['position' => $position, 'is_active' => true],
            );

            $product->colors()->sync(
                collect($stock)
                    ->mapWithKeys(fn ($status, $name) => [$colors[$name]->id => ['status' => $status]])
                    ->all()
            );
        }
    }
}
