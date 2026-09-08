<?php

namespace Tests\Feature;

use App\Models\Cart;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CartTest extends TestCase
{
    use RefreshDatabase;

    private function retailer(string $email = 'buyer@example.com'): User
    {
        return User::create([
            'name' => 'Buyer', 'company' => 'Store',
            'email' => $email, 'password' => 'passwordtest123',
        ]);
    }

    /** @return array<string, mixed> */
    private function line(array $overrides = []): array
    {
        return array_merge([
            'key' => 'serow-oxford|White|{"M":1}|false|false',
            'productId' => 'serow-oxford',
            'colorName' => 'White',
            'ratio' => ['M' => 1, 'L' => 1, 'XL' => 1, 'XXL' => 1],
            'sets' => 12,
            'privateLabel' => false,
            'sample' => false,
        ], $overrides);
    }

    public function test_the_cart_is_closed_to_guests(): void
    {
        $this->getJson('/api/account/cart')->assertUnauthorized();
        $this->putJson('/api/account/cart', ['items' => []])->assertUnauthorized();
    }

    public function test_a_retailer_starts_with_an_empty_cart(): void
    {
        $this->actingAs($this->retailer())
            ->getJson('/api/account/cart')
            ->assertOk()
            ->assertExactJson(['items' => [], 'updated_at' => null]);
    }

    public function test_a_saved_cart_comes_back_on_the_next_device(): void
    {
        $user = $this->retailer();

        $this->actingAs($user)
            ->putJson('/api/account/cart', ['items' => [$this->line()]])
            ->assertOk()
            ->assertJsonPath('items.0.productId', 'serow-oxford')
            ->assertJsonPath('items.0.sets', 12);

        // A different session for the same account — the phone, in other words.
        $this->actingFresh($user)
            ->getJson('/api/account/cart')
            ->assertOk()
            ->assertJsonPath('items.0.colorName', 'White')
            ->assertJsonCount(1, 'items');
    }

    /**
     * The cart is a shopping list, not a quote. Anything a client sends beyond
     * the known fields — a price, especially — is dropped on the way in.
     */
    public function test_it_stores_only_the_fields_it_knows(): void
    {
        $user = $this->retailer();

        $this->actingAs($user)->putJson('/api/account/cart', [
            'items' => [$this->line(['perSet' => 1, 'total' => 1, 'is_admin' => true])],
        ])->assertOk();

        $stored = $user->cart->items[0];

        $this->assertSame(
            ['key', 'productId', 'colorName', 'ratio', 'sets', 'privateLabel', 'sample'],
            array_keys($stored)
        );
    }

    public function test_emptying_the_cart_removes_the_row(): void
    {
        $user = $this->retailer();

        $this->actingAs($user)->putJson('/api/account/cart', ['items' => [$this->line()]])->assertOk();
        $this->assertDatabaseCount('carts', 1);

        $this->actingAs($user)->putJson('/api/account/cart', ['items' => []])
            ->assertOk()
            ->assertExactJson(['items' => [], 'updated_at' => null]);

        $this->assertDatabaseCount('carts', 0);
    }

    public function test_a_malformed_line_is_rejected(): void
    {
        $user = $this->retailer();

        $this->actingAs($user)
            ->putJson('/api/account/cart', ['items' => [$this->line(['sets' => 0])]])
            ->assertStatus(422)
            ->assertJsonValidationErrors('items.0.sets');

        $this->actingFresh($user)
            ->putJson('/api/account/cart', ['items' => [$this->line(['ratio' => []])]])
            ->assertStatus(422)
            ->assertJsonValidationErrors('items.0.ratio');
    }

    public function test_an_absurd_number_of_lines_is_refused(): void
    {
        $items = [];
        for ($i = 0; $i < 61; $i++) {
            $items[] = $this->line(['key' => "line-{$i}"]);
        }

        $this->actingAs($this->retailer())
            ->putJson('/api/account/cart', ['items' => $items])
            ->assertStatus(422)
            ->assertJsonValidationErrors('items');
    }

    public function test_a_retailer_never_sees_another_retailers_cart(): void
    {
        $mine = $this->retailer();
        $theirs = $this->retailer('other@example.com');

        Cart::create(['user_id' => $theirs->id, 'items' => [$this->line()]]);

        $this->actingAs($mine)
            ->getJson('/api/account/cart')
            ->assertOk()
            ->assertJsonCount(0, 'items');
    }

    public function test_deleting_a_retailer_takes_their_cart_with_them(): void
    {
        $user = $this->retailer();

        $this->actingAs($user)->putJson('/api/account/cart', ['items' => [$this->line()]])->assertOk();
        $user->delete();

        $this->assertDatabaseCount('carts', 0);
    }
}
