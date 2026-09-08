<?php

namespace App\Support\Payments;

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Http\Request;

/**
 * What the app needs from a payment gateway, and nothing else. Two very
 * different providers sit behind this so the controllers do not have to know
 * which one they are talking to.
 */
interface Gateway
{
    /** Stored on the payment row and posted back by the browser. */
    public function key(): string;

    /** What the retailer sees on the button. */
    public function label(): string;

    /** One line under the button saying what it will actually do. */
    public function blurb(): string;

    /** The currency this gateway charges in. */
    public function currency(): string;

    /**
     * False until its keys are configured — and, where a gateway needs one, an
     * exchange rate too. A gateway that is not ready simply does not appear.
     */
    public function isEnabled(): bool;

    /**
     * Opens an order at the gateway.
     *
     * @return array{id: string, client: array<string, mixed>} the gateway's own
     *                                                         order id, and what the browser SDK needs to show its checkout
     */
    public function createOrder(Order $order, Charge $charge): array;

    /**
     * Checks what the browser handed back after the buyer paid, and returns the
     * gateway's payment reference — or null if it does not verify.
     *
     * Never trusted on its own: the browser is the one participant in a payment
     * with a reason to lie. Razorpay signs its callback and PayPal is asked to
     * capture server-side, so in both cases the answer comes from the gateway.
     *
     * @param  array<string, mixed>  $input
     * @return array{payment_id: string, raw: array<string, mixed>}|null
     */
    public function confirm(Payment $payment, array $input): ?array;

    /**
     * Verifies a webhook and, when it says an order was paid, returns what is
     * needed to settle it. Null for anything unverified or uninteresting.
     *
     * The webhook is the safety net: a buyer whose browser died between paying
     * and returning to the site still gets their order marked paid.
     *
     * @return array{gateway_order_id: string, payment_id: string, minor_units: int, currency: string, raw: array<string, mixed>}|null
     */
    public function paidWebhook(Request $request): ?array;
}
