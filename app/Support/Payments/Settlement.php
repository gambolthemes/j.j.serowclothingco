<?php

namespace App\Support\Payments;

use App\Mail\OrderStatusChanged;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Turns a verified payment into a paid order.
 *
 * Both the browser callback and the webhook end up here, usually both for the
 * same payment and sometimes at the same moment, so this has to be safe to run
 * twice. Everything that decides whether to act happens inside one transaction
 * behind a row lock.
 */
final class Settlement
{
    /**
     * @param  array<string, mixed>  $raw
     * @return bool whether this call is the one that settled it
     */
    public static function record(Payment $payment, string $gatewayPaymentId, array $raw): bool
    {
        $settled = DB::transaction(function () use ($payment, $gatewayPaymentId, $raw) {
            $locked = Payment::whereKey($payment->getKey())->lockForUpdate()->first();

            // Already done — a replayed webhook, or the callback arriving just
            // after it. Not an error, and emphatically not a second email.
            if ($locked === null || $locked->isPaid()) {
                return false;
            }

            $locked->update([
                'status' => Payment::PAID,
                'gateway_payment_id' => $gatewayPaymentId,
                'raw' => $raw,
                'paid_at' => now(),
            ]);

            $order = Order::whereKey($locked->order_id)->lockForUpdate()->first();

            // Forward only. A late webhook must not drag an order that is
            // already being cut back to "payment received", and a cancelled
            // order needs a person to look at it, not an automatic revival.
            if ($order && $order->status === 'placed') {
                $order->update(['status' => 'payment_received']);

                $order->statusEvents()->create([
                    'user_id' => null,
                    'actor_name' => self::actor($locked->gateway),
                    'from_status' => 'placed',
                    'to_status' => 'payment_received',
                    'note' => self::note($locked),
                    'created_at' => now(),
                ]);

                return true;
            }

            return false;
        });

        if ($settled) {
            self::notify($payment->fresh());
        }

        return $settled;
    }

    /** Records a failed attempt so the desk can see it was tried. */
    public static function fail(Payment $payment, array $raw = []): void
    {
        if ($payment->isPaid()) {
            return;
        }

        $payment->update(['status' => Payment::FAILED, 'raw' => $raw]);
    }

    private static function actor(string $gateway): string
    {
        return match ($gateway) {
            'razorpay' => 'Razorpay',
            'paypal' => 'PayPal',
            default => $gateway,
        };
    }

    private static function note(Payment $payment): string
    {
        $amount = $payment->currency.' '.number_format((float) $payment->amount, 2);

        return $payment->currency === 'INR'
            ? "Paid online — {$amount}."
            : "Paid online — {$amount} at ₹{$payment->fx_rate}.";
    }

    private static function notify(?Payment $payment): void
    {
        $order = $payment?->order()->with('user')->first();

        if (! $order?->user) {
            return;
        }

        // The money is already taken and the order already moved; a mail
        // problem must not undo either of those.
        try {
            Mail::to($order->user->email)->queue(
                new OrderStatusChanged($order, 'Payment received — thank you. Production starts now.')
            );
        } catch (\Throwable $e) {
            Log::warning('Payment confirmation mail failed', [
                'code' => $order->code,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
