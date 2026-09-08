<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * The guest endpoints are the only ones a stranger can hammer. These assert the
 * doors actually shut — a wrong password answering 422 forever is a
 * brute-force oracle, not a login form.
 */
class RateLimitTest extends TestCase
{
    use RefreshDatabase;

    private function retailer(string $email = 'buyer@example.com'): User
    {
        return User::create([
            'name' => 'Buyer', 'company' => 'Store',
            'email' => $email, 'password' => 'passwordtest123',
        ]);
    }

    public function test_login_stops_answering_after_five_wrong_passwords(): void
    {
        $this->retailer();

        $attempt = fn () => $this->postJson('/auth/login', [
            'email' => 'buyer@example.com', 'password' => 'wrong',
        ]);

        for ($i = 0; $i < 5; $i++) {
            $attempt()->assertStatus(422);
        }

        $attempt()->assertStatus(429)->assertJsonStructure(['message']);
    }

    /** The lockout has to hold even when the next guess would have been right. */
    public function test_a_locked_out_account_does_not_open_for_the_real_password(): void
    {
        $this->retailer();

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/auth/login', ['email' => 'buyer@example.com', 'password' => 'wrong']);
        }

        $this->postJson('/auth/login', ['email' => 'buyer@example.com', 'password' => 'passwordtest123'])
            ->assertStatus(429);
    }

    /** Keyed per account, so one buyer being attacked cannot lock out another. */
    public function test_one_account_being_attacked_does_not_lock_out_the_next(): void
    {
        $this->retailer('other@example.com');

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/auth/login', ['email' => 'target@example.com', 'password' => 'wrong']);
        }

        $this->postJson('/auth/login', ['email' => 'other@example.com', 'password' => 'passwordtest123'])
            ->assertOk();
    }

    public function test_registration_stops_after_five_accounts_from_one_address(): void
    {
        $register = fn (int $n) => $this->postJson('/auth/register', [
            'name' => "Buyer {$n}", 'company' => 'Store', 'email' => "buyer{$n}@example.com",
            'password' => 'passwordtest123', 'password_confirmation' => 'passwordtest123',
        ]);

        for ($n = 1; $n <= 5; $n++) {
            $this->flushSession();
            $register($n)->assertCreated();
        }

        $this->flushSession();
        $register(6)->assertStatus(429);
        $this->assertSame(5, User::count());
    }

    public function test_reset_links_stop_after_five_requests_for_one_address(): void
    {
        Mail::fake();
        $this->retailer();

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/auth/forgot-password', ['email' => 'buyer@example.com'])->assertOk();
        }

        $this->postJson('/auth/forgot-password', ['email' => 'buyer@example.com'])->assertStatus(429);
    }
}
