<?php

namespace Tests\Feature;

use App\Mail\OrderPlaced;
use App\Models\Color;
use App\Models\Order;
use App\Models\Product;
use App\Models\Setting;
use App\Models\User;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class OrderTest extends TestCase
{
    use RefreshDatabase;

    private User $retailer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(CatalogSeeder::class);
        $this->retailer = User::create([
            'name' => 'Test Buyer',
            'company' => 'Test Store',
            'email' => 'buyer@example.com',
            'password' => 'passwordtest123',
        ]);
    }

    /** @return array<string, mixed> */
    private function line(array $overrides = []): array
    {
        return array_merge([
            'product_id' => 'serow-oxford',
            'color_name' => 'White',
            'ratio' => ['M' => 1, 'L' => 1, 'XL' => 1, 'XXL' => 1],
            'sets' => 12,
        ], $overrides);
    }

    public function test_it_prices_an_order_from_the_catalog_and_ignores_what_the_client_sends(): void
    {
        Mail::fake();

        // White is 3200 and this style adds nothing; 12 sets sits in the 0%
        // tier, and the ratio is exactly one standard set.
        $response = $this->actingAs($this->retailer)->postJson('/api/account/orders', [
            'items' => [$this->line([
                'product_name' => 'HACKED',
                'per_set_price' => 1,
                'line_total' => 1,
            ])],
        ]);

        $response->assertCreated()
            ->assertJsonPath('order.subtotal', 38400)
            ->assertJsonPath('order.gst', 1920)
            ->assertJsonPath('order.total', 40320);

        $this->assertSame('Serow Oxford Shirt', Order::first()->items->first()->product_name);
    }

    public function test_it_applies_the_volume_tier_discount(): void
    {
        Mail::fake();

        // 40 sets falls in the 6% tier: 3200 * 0.94 = 3008 per set.
        $this->actingAs($this->retailer)
            ->postJson('/api/account/orders', ['items' => [$this->line(['sets' => 40])]])
            ->assertCreated()
            ->assertJsonPath('order.subtotal', 120320);
    }

    public function test_it_rejects_a_line_below_the_configured_moq(): void
    {
        $this->actingAs($this->retailer)
            ->postJson('/api/account/orders', ['items' => [$this->line(['sets' => 9])]])
            ->assertStatus(422)
            ->assertJsonValidationErrors('items.0.sets');
    }

    public function test_changing_the_moq_setting_changes_what_checkout_accepts(): void
    {
        Setting::putMany(['MOQ_SETS' => 25]);

        $this->actingAs($this->retailer)
            ->postJson('/api/account/orders', ['items' => [$this->line(['sets' => 20])]])
            ->assertStatus(422)
            ->assertJsonValidationErrors('items.0.sets');
    }

    public function test_it_refuses_an_out_of_stock_colourway(): void
    {
        $product = Product::where('slug', 'serow-oxford')->first();
        $white = Color::where('name', 'White')->first();
        $product->colors()->updateExistingPivot($white->id, ['status' => 'out_of_stock']);

        $this->actingAs($this->retailer)
            ->postJson('/api/account/orders', ['items' => [$this->line()]])
            ->assertStatus(422)
            ->assertJsonValidationErrors('items.0.color_name');
    }

    public function test_it_refuses_a_product_that_is_not_in_the_catalog(): void
    {
        $this->actingAs($this->retailer)
            ->postJson('/api/account/orders', ['items' => [$this->line(['product_id' => 'not-real'])]])
            ->assertStatus(422)
            ->assertJsonValidationErrors('items.0.product_id');
    }

    public function test_it_emails_the_retailer_when_an_order_is_placed(): void
    {
        Mail::fake();

        $this->actingAs($this->retailer)
            ->postJson('/api/account/orders', ['items' => [$this->line()]])
            ->assertCreated();

        Mail::assertQueued(OrderPlaced::class);
    }

    public function test_a_retailer_can_cancel_before_production_but_not_twice(): void
    {
        Mail::fake();

        $this->actingAs($this->retailer)
            ->postJson('/api/account/orders', ['items' => [$this->line()]])
            ->assertCreated();

        $code = Order::first()->code;

        $this->actingAs($this->retailer)
            ->postJson("/api/account/orders/{$code}/cancel")
            ->assertOk()
            ->assertJsonPath('order.status', 'cancelled');

        $this->actingAs($this->retailer)
            ->postJson("/api/account/orders/{$code}/cancel")
            ->assertStatus(422);
    }

    public function test_a_retailer_cannot_see_another_retailers_order(): void
    {
        Mail::fake();

        $this->actingAs($this->retailer)
            ->postJson('/api/account/orders', ['items' => [$this->line()]])
            ->assertCreated();

        $other = User::create([
            'name' => 'Other', 'company' => 'Other Co',
            'email' => 'other@example.com', 'password' => 'passwordtest123',
        ]);

        $this->actingFresh($other)
            ->getJson('/api/account/orders/'.Order::first()->code)
            ->assertNotFound();
    }

    public function test_public_tracking_exposes_progress_but_never_money(): void
    {
        Mail::fake();

        $this->actingAs($this->retailer)
            ->postJson('/api/account/orders', ['items' => [$this->line()]])
            ->assertCreated();

        $this->getJson('/api/track/'.strtolower(Order::first()->code))
            ->assertOk()
            ->assertJsonPath('order.status', 'placed')
            ->assertJsonMissingPath('order.total')
            ->assertJsonMissingPath('order.items');
    }

    public function test_tracking_an_unknown_code_is_a_404(): void
    {
        $this->getJson('/api/track/JS-0000')->assertNotFound();
    }
}
