<?php

namespace App\Support\Payments;

use App\Models\Order;
use App\Models\Setting;
use RuntimeException;

/**
 * What to charge, in the currency the gateway takes, alongside what it settles
 * as against the order in rupees.
 *
 * Always built from the order total on the server. A gateway is told an amount
 * by us and never by the browser — a client that could name its own figure is a
 * client that pays ₹1 for a ₹1,50,000 order.
 */
final class Charge
{
    private function __construct(
        public readonly float $amount,
        public readonly string $currency,
        public readonly float $amountInr,
        public readonly ?float $fxRate,
    ) {}

    /** Paise or cents — every gateway here wants the minor unit, not a decimal. */
    public function minorUnits(): int
    {
        return (int) round($this->amount * 100);
    }

    /** The decimal string a JSON API wants: "1798.20", never "1798.2". */
    public function value(): string
    {
        return number_format($this->amount, 2, '.', '');
    }

    public static function forOrder(Order $order, string $currency): self
    {
        $inr = round((float) $order->total, 2);

        if ($currency === 'INR') {
            return new self($inr, 'INR', $inr, null);
        }

        // PayPal cannot settle INR cross-border, so a foreign-currency charge is
        // converted at a rate staff set — deliberately not a live feed, so the
        // figure a buyer is quoted cannot move between the page and the capture.
        $rate = (float) Setting::get('PAYPAL_FX_RATE');

        if ($rate <= 0) {
            throw new RuntimeException(
                'No exchange rate is set, so orders cannot be charged in '.$currency.'.'
            );
        }

        return new self(round($inr / $rate, 2), $currency, $inr, $rate);
    }
}
