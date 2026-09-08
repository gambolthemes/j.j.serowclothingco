<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Mail\PasswordResetLink;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Mail;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The signed-in user as the SPA sees them. Deliberately hand-listed: never
     * serialise the whole row, and never expose anything not needed for the UI.
     */
    public function publicPayload(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'company' => $this->company,
            'email' => $this->email,
            'is_admin' => (bool) $this->is_admin,
        ];
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class)->latest('placed_at');
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(Address::class)->orderByDesc('is_default')->orderBy('label');
    }

    /** The draft cart that follows the retailer between devices. At most one. */
    public function cart(): HasOne
    {
        return $this->hasOne(Cart::class);
    }

    /** Billing identity and how the advance arrives. No card data — see the model. */
    public function paymentProfile(): HasOne
    {
        return $this->hasOne(PaymentProfile::class);
    }

    /**
     * Password resets go out as our own Mailable rather than the framework's
     * stock notification, so the mail looks like the order mail retailers
     * already get from us. Queued for the same reason the order mail is: a
     * forgotten password should not leave someone watching a spinner while an
     * SMTP handshake completes.
     */
    public function sendPasswordResetNotification(#[\SensitiveParameter] $token): void
    {
        Mail::to($this->email)->queue(new PasswordResetLink($this, $token));
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'company',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_admin' => 'boolean',
        ];
    }
}
