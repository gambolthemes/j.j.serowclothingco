<?php

namespace Tests\Feature;

use App\Models\Product;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CatalogSeeder::class);
    }

    public function test_robots_blocks_the_private_areas_and_points_at_the_sitemap(): void
    {
        $response = $this->get('/robots.txt')->assertOk();

        $response->assertHeader('Content-Type', 'text/plain; charset=UTF-8');
        $response->assertSee('Disallow: /admin', false);
        $response->assertSee('Disallow: /account', false);
        $response->assertSee('Disallow: /api/', false);
        $response->assertSee('Sitemap: '.url('/sitemap.xml'), false);
    }

    public function test_the_sitemap_lists_the_live_catalog(): void
    {
        $product = Product::where('is_active', true)->firstOrFail();

        $this->get('/sitemap.xml')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/xml; charset=UTF-8')
            ->assertSee(url('/catalog'), false)
            ->assertSee(url('/product/'.$product->slug), false);
    }

    public function test_the_sitemap_leaves_out_retired_products_and_private_pages(): void
    {
        $product = Product::where('is_active', true)->firstOrFail();
        $product->update(['is_active' => false]);

        $response = $this->get('/sitemap.xml')->assertOk();

        $response->assertDontSee(url('/product/'.$product->slug), false);
        $response->assertDontSee(url('/admin'), false);
        $response->assertDontSee(url('/cart'), false);
    }
}
