<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountTest extends TestCase
{
    use RefreshDatabase;

    private function address(array $overrides = []): array
    {
        return array_merge([
            'label' => 'Warehouse',
            'contact_name' => 'Buyer',
            'phone' => '9876543210',
            'line1' => '12 MG Road',
            'city' => 'Kochi',
            'state' => 'Kerala',
            'pincode' => '682001',
        ], $overrides);
    }

    private function retailer(): User
    {
        return User::create([
            'name' => 'Buyer', 'company' => 'Store',
            'email' => 'buyer@example.com', 'password' => 'passwordtest123',
        ]);
    }

    public function test_registration_signs_the_retailer_in(): void
    {
        $this->postJson('/auth/register', [
            'name' => 'Buyer', 'company' => 'Store', 'email' => 'buyer@example.com',
            'password' => 'passwordtest123', 'password_confirmation' => 'passwordtest123',
        ])->assertCreated();

        $this->getJson('/auth/user')->assertOk()->assertJsonPath('user.email', 'buyer@example.com');
    }

    public function test_a_wrong_password_is_a_validation_error_not_a_crash(): void
    {
        $this->retailer();

        $this->postJson('/auth/login', ['email' => 'buyer@example.com', 'password' => 'nope'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    public function test_the_account_area_is_closed_to_guests(): void
    {
        $this->getJson('/api/account/orders')->assertUnauthorized();
        $this->getJson('/api/account/addresses')->assertUnauthorized();
    }

    public function test_the_first_address_becomes_the_default(): void
    {
        $this->actingAs($this->retailer())
            ->postJson('/api/account/addresses', $this->address())
            ->assertCreated()
            ->assertJsonPath('address.is_default', true);
    }

    public function test_unchecking_the_default_hands_it_to_another_address(): void
    {
        $user = $this->retailer();

        $this->actingAs($user)->postJson('/api/account/addresses', $this->address(['label' => 'One']));
        $this->actingAs($user)->postJson('/api/account/addresses', $this->address(['label' => 'Two']));

        $first = $user->addresses()->where('label', 'One')->first();

        $this->actingAs($user)->putJson("/api/account/addresses/{$first->id}", $this->address([
            'label' => 'One', 'is_default' => false,
        ]))->assertOk();

        $this->assertSame(1, $user->addresses()->where('is_default', true)->count());
        $this->assertFalse($first->fresh()->is_default);
    }

    public function test_the_only_address_stays_the_default(): void
    {
        $user = $this->retailer();
        $this->actingAs($user)->postJson('/api/account/addresses', $this->address());
        $only = $user->addresses()->first();

        $this->actingAs($user)->putJson("/api/account/addresses/{$only->id}", $this->address([
            'is_default' => false,
        ]))->assertOk();

        $this->assertTrue($only->fresh()->is_default);
    }

    public function test_deleting_the_default_promotes_another(): void
    {
        $user = $this->retailer();
        $this->actingAs($user)->postJson('/api/account/addresses', $this->address(['label' => 'One']));
        $this->actingAs($user)->postJson('/api/account/addresses', $this->address(['label' => 'Two']));

        $default = $user->addresses()->where('is_default', true)->first();
        $this->actingAs($user)->deleteJson("/api/account/addresses/{$default->id}")->assertOk();

        $this->assertSame(1, $user->addresses()->where('is_default', true)->count());
    }

    public function test_a_retailer_cannot_touch_another_retailers_address(): void
    {
        $owner = $this->retailer();
        $this->actingAs($owner)->postJson('/api/account/addresses', $this->address());

        $intruder = User::create([
            'name' => 'Other', 'company' => 'Other Co',
            'email' => 'other@example.com', 'password' => 'passwordtest123',
        ]);

        $this->actingFresh($intruder)
            ->putJson('/api/account/addresses/'.$owner->addresses()->first()->id, $this->address())
            ->assertNotFound();
    }

    public function test_a_bad_pincode_is_rejected(): void
    {
        $this->actingAs($this->retailer())
            ->postJson('/api/account/addresses', $this->address(['pincode' => 'ABC123']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('pincode');
    }

    public function test_changing_the_password_needs_the_current_one(): void
    {
        $this->actingAs($this->retailer())->putJson('/api/account/password', [
            'current_password' => 'wrong',
            'password' => 'brandnewpass99',
            'password_confirmation' => 'brandnewpass99',
        ])->assertStatus(422)->assertJsonValidationErrors('current_password');
    }

    public function test_an_unknown_url_is_a_404_not_the_homepage(): void
    {
        $this->get('/')->assertOk();
        $this->get('/catalog')->assertOk();
        $this->get('/nope')->assertNotFound();
        $this->get('/catalog/typo')->assertNotFound();
    }
}
