<?php

namespace App\Support\Payments;

/**
 * The gateways this app knows about. Registered here rather than resolved from
 * a string, so a request naming a gateway can only reach one of these two.
 */
final class Gateways
{
    /** @var array<string, class-string<Gateway>> */
    private const REGISTERED = [
        'razorpay' => RazorpayGateway::class,
        'paypal' => PayPalGateway::class,
    ];

    /** @var array<string, Gateway>|null */
    private static ?array $instances = null;

    /** @return array<string, Gateway> */
    public static function all(): array
    {
        return self::$instances ??= array_map(
            fn (string $class) => app($class),
            self::REGISTERED
        );
    }

    /** Only the ones actually configured — the rest do not exist as far as the UI is concerned. */
    public static function enabled(): array
    {
        return array_filter(self::all(), fn (Gateway $gateway) => $gateway->isEnabled());
    }

    /**
     * A gateway that may be offered to a retailer right now. Use this to open a
     * payment — never to finish one.
     */
    public static function find(string $key): ?Gateway
    {
        $gateway = self::all()[$key] ?? null;

        return $gateway?->isEnabled() ? $gateway : null;
    }

    /**
     * A registered gateway, enabled or not. This is what a payment already in
     * flight must be settled through.
     *
     * Turning a gateway off — pulling its keys, or zeroing the PayPal rate —
     * means "stop offering this", not "abandon money already taken". Resolving
     * a webhook through find() would 404 those callbacks and leave a buyer
     * charged with their order still sitting unpaid.
     */
    public static function handler(string $key): ?Gateway
    {
        return self::all()[$key] ?? null;
    }

    /**
     * What the checkout screen renders. Nothing sensitive: the keys a browser
     * needs come later, from the call that opens a specific payment.
     *
     * @return list<array<string, mixed>>
     */
    public static function options(): array
    {
        return array_values(array_map(fn (Gateway $gateway) => [
            'key' => $gateway->key(),
            'label' => $gateway->label(),
            'blurb' => $gateway->blurb(),
            'currency' => $gateway->currency(),
        ], self::enabled()));
    }

    /** Test seam — the registry caches instances for the life of the process. */
    public static function flush(): void
    {
        self::$instances = null;
    }
}
