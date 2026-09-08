<?php

namespace Tests\Feature;

use App\Mail\PasswordResetLink;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    private function retailer(): User
    {
        return User::create([
            'name' => 'Buyer', 'company' => 'Store',
            'email' => 'buyer@example.com', 'password' => 'passwordtest123',
        ]);
    }

    /** Runs the "forgot password" step and hands back the token that was mailed. */
    private function requestLink(string $email): string
    {
        $this->postJson('/auth/forgot-password', ['email' => $email])->assertOk();

        $token = '';
        Mail::assertQueued(PasswordResetLink::class, function (PasswordResetLink $mail) use (&$token) {
            $token = $mail->token;

            return true;
        });

        return $token;
    }

    public function test_a_forgotten_password_mails_a_link(): void
    {
        Mail::fake();
        $user = $this->retailer();

        $this->postJson('/auth/forgot-password', ['email' => 'buyer@example.com'])
            ->assertOk()
            ->assertJsonStructure(['status']);

        Mail::assertQueued(
            PasswordResetLink::class,
            fn (PasswordResetLink $mail) => $mail->hasTo($user->email) && $mail->token !== ''
        );
    }

    /**
     * Renders the mail rather than trusting that it was queued: a typo in the
     * blade or in the query string is invisible to Mail::assertQueued, and the
     * link is the entire point of the message.
     */
    public function test_the_mail_carries_a_link_back_into_the_spa(): void
    {
        Mail::fake();
        $user = $this->retailer();

        $this->postJson('/auth/forgot-password', ['email' => $user->email])->assertOk();

        Mail::assertQueued(PasswordResetLink::class, function (PasswordResetLink $mail) use ($user) {
            $expected = url('/reset-password?'.http_build_query([
                'token' => $mail->token,
                'email' => $user->email,
            ]));

            // e() because blade escapes the & between the two query parameters.
            return str_contains($mail->render(), e($expected));
        });
    }

    /**
     * The form must not double as a way to find out who banks with us — an
     * address we have never seen gets the same answer as a real one, just no
     * mail behind it.
     */
    public function test_an_unknown_address_gets_the_same_answer_and_no_mail(): void
    {
        Mail::fake();
        $this->retailer();

        $known = $this->postJson('/auth/forgot-password', ['email' => 'buyer@example.com']);
        $unknown = $this->postJson('/auth/forgot-password', ['email' => 'stranger@example.com']);

        $unknown->assertOk();
        $this->assertSame($known->json('status'), $unknown->json('status'));
        Mail::assertQueuedCount(1);
    }

    public function test_the_link_sets_a_new_password_and_retires_the_old_one(): void
    {
        Mail::fake();
        $user = $this->retailer();

        $this->postJson('/auth/reset-password', [
            'token' => $this->requestLink($user->email),
            'email' => $user->email,
            'password' => 'brand-new-password',
            'password_confirmation' => 'brand-new-password',
        ])->assertOk();

        $this->assertTrue(Hash::check('brand-new-password', $user->fresh()->password));

        $this->postJson('/auth/login', ['email' => $user->email, 'password' => 'passwordtest123'])
            ->assertStatus(422);

        $this->flushSession();
        $this->postJson('/auth/login', ['email' => $user->email, 'password' => 'brand-new-password'])
            ->assertOk();
    }

    public function test_a_token_only_works_once(): void
    {
        Mail::fake();
        $user = $this->retailer();
        $token = $this->requestLink($user->email);

        $reset = fn (string $password) => $this->postJson('/auth/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => $password,
            'password_confirmation' => $password,
        ]);

        $reset('brand-new-password')->assertOk();
        $reset('another-password-1')->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_a_tampered_token_is_rejected(): void
    {
        Mail::fake();
        $user = $this->retailer();
        $this->requestLink($user->email);

        $this->postJson('/auth/reset-password', [
            'token' => 'not-the-token-we-mailed',
            'email' => $user->email,
            'password' => 'brand-new-password',
            'password_confirmation' => 'brand-new-password',
        ])->assertStatus(422)->assertJsonValidationErrors('email');

        $this->assertTrue(Hash::check('passwordtest123', $user->fresh()->password));
    }

    /** The same 10-character floor registration and the account screen enforce. */
    public function test_the_new_password_still_has_to_be_long_enough(): void
    {
        Mail::fake();
        $user = $this->retailer();

        $this->postJson('/auth/reset-password', [
            'token' => $this->requestLink($user->email),
            'email' => $user->email,
            'password' => 'short',
            'password_confirmation' => 'short',
        ])->assertStatus(422)->assertJsonValidationErrors('password');
    }
}
