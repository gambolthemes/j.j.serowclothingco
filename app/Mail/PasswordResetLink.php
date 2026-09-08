<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * The reset link, as a Mailable rather than Laravel's stock notification, so it
 * reads like the order mail the retailer already gets from us.
 *
 * The link points at /reset-password, a react-router page — not a Laravel view —
 * so there is no named `password.reset` route to generate it from.
 */
class PasswordResetLink extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public User $user, public string $token) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Reset your J.J. Serow account password');
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.password-reset',
            with: [
                // The address is carried in the URL because Password::reset()
                // verifies the token against it; the SPA just passes it back.
                'url' => url('/reset-password?'.http_build_query([
                    'token' => $this->token,
                    'email' => $this->user->email,
                ])),
                'expiresInMinutes' => config('auth.passwords.users.expire'),
            ],
        );
    }
}
