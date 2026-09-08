<?php

namespace Tests\Feature;

use App\Mail\OrderStatusChanged;
use App\Models\Order;
use App\Models\Setting;
use App\Models\User;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AdminTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $retailer;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();

        $this->seed(CatalogSeeder::class);

        $this->retailer = User::create([
            'name' => 'Buyer', 'company' => 'Store',
            'email' => 'buyer@example.com', 'password' => 'passwordtest123',
        ]);

        $this->admin = User::create([
            'name' => 'Staff', 'company' => 'J.J. Serow',
            'email' => 'staff@example.com', 'password' => 'passwordtest123',
        ]);
        $this->admin->forceFill(['is_admin' => true])->save();
    }

    private function placeOrder(int $sets = 12): Order
    {
        $this->actingAs($this->retailer)->postJson('/api/account/orders', [
            'items' => [[
                'product_id' => 'serow-oxford',
                'color_name' => 'White',
                'ratio' => ['M' => 1, 'L' => 1, 'XL' => 1, 'XXL' => 1],
                'sets' => $sets,
            ]],
        ])->assertCreated();

        return Order::latest('id')->first();
    }

    public function test_admin_is_never_granted_through_the_app(): void
    {
        $this->postJson('/auth/register', [
            'name' => 'Sneaky', 'company' => 'Sneaky Co',
            'email' => 'sneaky@example.com',
            'password' => 'passwordtest123', 'password_confirmation' => 'passwordtest123',
            'is_admin' => true,
        ])->assertCreated()->assertJsonPath('user.is_admin', false);

        $this->actingFresh($this->retailer)->putJson('/api/account/profile', [
            'name' => 'Buyer', 'company' => 'Store',
            'email' => 'buyer@example.com', 'is_admin' => true,
        ])->assertOk()->assertJsonPath('user.is_admin', false);
    }

    public function test_a_signed_in_retailer_is_forbidden_from_the_admin_api(): void
    {
        $this->actingAs($this->retailer)->getJson('/api/admin/orders')->assertForbidden();
    }

    public function test_a_guest_is_unauthorised_on_the_admin_api(): void
    {
        $this->getJson('/api/admin/orders')->assertUnauthorized();
    }

    public function test_moving_a_stage_records_history_and_emails_the_retailer(): void
    {
        $order = $this->placeOrder();

        $this->actingFresh($this->admin)
            ->putJson("/api/admin/orders/{$order->code}/status", [
                'status' => 'cutting',
                'notes' => 'Fabric issued',
            ])
            ->assertOk()
            ->assertJsonPath('order.status', 'cutting');

        Mail::assertQueued(OrderStatusChanged::class);

        $this->actingFresh($this->admin)
            ->getJson("/api/admin/orders/{$order->code}")
            ->assertOk()
            // Newest first: the stage move, then the original placement.
            ->assertJsonPath('order.history.0.to_status', 'cutting')
            ->assertJsonPath('order.history.0.actor_name', 'Staff')
            ->assertJsonPath('order.history.1.to_status', 'placed');
    }

    public function test_an_unknown_stage_is_rejected(): void
    {
        $order = $this->placeOrder();

        $this->actingFresh($this->admin)
            ->putJson("/api/admin/orders/{$order->code}/status", ['status' => 'teleported'])
            ->assertStatus(422);
    }

    public function test_editing_lines_reprices_against_the_current_tier(): void
    {
        // 40 sets earns the 6% tier; dropping to 20 must lose it again.
        $order = $this->placeOrder(40);
        $this->assertSame(120320.0, (float) $order->subtotal);

        $this->actingFresh($this->admin)
            ->putJson("/api/admin/orders/{$order->code}/items", [
                'items' => [['id' => $order->items->first()->id, 'sets' => 20]],
                'removed' => [],
            ])
            ->assertOk()
            ->assertJsonPath('order.total_sets', 20)
            ->assertJsonPath('order.subtotal', 64000);
    }

    public function test_an_order_cannot_be_stripped_of_every_line(): void
    {
        $order = $this->placeOrder();

        $this->actingFresh($this->admin)
            ->putJson("/api/admin/orders/{$order->code}/items", ['items' => [], 'removed' => []])
            ->assertStatus(422);
    }

    public function test_tiers_must_be_listed_smallest_first(): void
    {
        $payload = Setting::values();
        $payload['TIERS'] = array_reverse($payload['TIERS']);

        $this->actingAs($this->admin)
            ->putJson('/api/admin/settings', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors('TIERS');
    }

    public function test_an_admin_cannot_revoke_their_own_access(): void
    {
        $this->actingAs($this->admin)
            ->putJson("/api/admin/retailers/{$this->admin->id}/role", ['is_admin' => false])
            ->assertStatus(422);

        $this->assertTrue($this->admin->fresh()->is_admin);
    }

    public function test_a_product_created_without_a_slug_gets_one_from_its_name(): void
    {
        $this->actingAs($this->admin)->postJson('/api/admin/products', [
            'name' => 'Test Hoodie',
            'category' => 'tees',
            'fabric' => '350 GSM Fleece',
            'image' => 'https://example.com/a.png',
            'price_mod' => 900,
            'blurb' => 'A test product.',
        ])->assertCreated()->assertJsonPath('product.slug', 'test-hoodie');
    }
}
