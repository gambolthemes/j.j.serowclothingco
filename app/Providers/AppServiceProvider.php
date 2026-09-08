<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->rateLimiters();
    }

    /**
     * Budgets for the unauthenticated endpoints. Everything else in the app
     * sits behind `auth`, where the session is the limit; these four are the
     * only doors a stranger can knock on repeatedly.
     */
    private function rateLimiters(): void
    {
        // Two budgets on purpose. The per-account one is what stops a password
        // being guessed, and it holds even if the attacker rotates IPs. The
        // per-IP one is looser so a whole shop behind one connection does not
        // lock itself out when two buyers mistype at the same time.
        RateLimiter::for('login', fn (Request $request) => [
            Limit::perMinute(5)
                ->by('login:'.self::emailKey($request).'|'.$request->ip())
                ->response(self::tooMany('Too many sign-in attempts. Wait a minute and try again.')),
            Limit::perMinute(20)
                ->by('login-ip:'.$request->ip())
                ->response(self::tooMany('Too many sign-in attempts from this connection. Try again shortly.')),
        ]);

        // Registration is a human filling in a form once, so an hourly budget
        // is generous — it only bites a script farming accounts.
        RateLimiter::for('register', fn (Request $request) => Limit::perHour(5)
            ->by('register:'.$request->ip())
            ->response(self::tooMany('Too many sign-up attempts. Try again in an hour, or message us on WhatsApp.')));

        // Reset links are mail we pay to send and mail the retailer has to read.
        // Keyed by address first so nobody can flood one inbox from many IPs.
        RateLimiter::for('password-reset', fn (Request $request) => [
            Limit::perHour(5)
                ->by('reset:'.self::emailKey($request))
                ->response(self::tooMany('Too many reset requests for that email. Check your inbox, or try again later.')),
            Limit::perHour(15)
                ->by('reset-ip:'.$request->ip())
                ->response(self::tooMany('Too many reset requests from this connection. Try again later.')),
        ]);
    }

    /** Normalised so Buyer@Store.in and buyer@store.in share one budget. */
    private static function emailKey(Request $request): string
    {
        return Str::lower(trim((string) $request->input('email')));
    }

    /**
     * The SPA reads `message` off every failed response, so a 429 has to carry
     * one — the framework's bare "Too Many Attempts." tells a retailer nothing.
     */
    private static function tooMany(string $message): \Closure
    {
        return fn () => response()->json(['message' => $message], 429);
    }
}
