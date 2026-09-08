<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Support\Payments\Gateways;
use App\Support\Payments\Settlement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Gateway callbacks. Unauthenticated and CSRF-exempt by necessity — the caller
 * is a machine on the other side of the internet — so the signature check is
 * the only thing standing between this endpoint and anyone marking any order
 * paid. Each gateway does its own; an unverified request gets a 400 and
 * nothing else happens.
 *
 * This is the safety net rather than the happy path: the browser normally
 * confirms a payment before the webhook lands. Both routes end in Settlement,
 * which is written to be run twice.
 */
class WebhookController extends Controller
{
    public function __invoke(Request $request, string $gateway): JsonResponse
    {
        $handler = Gateways::find($gateway);

        if (! $handler) {
            return response()->json(['status' => 'unknown gateway'], 404);
        }

        $event = $handler->paidWebhook($request);

        if ($event === null) {
            // Either the signature did not check out, or it is an event we do
            // not act on. The two are logged differently inside the gateway;
            // here they are both "nothing to do".
            return response()->json(['status' => 'ignored'], 200);
        }

        $payment = Payment::where('gateway', $gateway)
            ->where('gateway_order_id', $event['gateway_order_id'])
            ->first();

        if (! $payment) {
            // A payment opened somewhere else, or against a deleted order.
            // Logged rather than retried: replaying it would not find it either.
            Log::warning('Webhook for an unknown payment', [
                'gateway' => $gateway,
                'gateway_order_id' => $event['gateway_order_id'],
            ]);

            return response()->json(['status' => 'unknown payment'], 200);
        }

        // The webhook says what was paid; we say what was owed. A mismatch is
        // not something to settle quietly — it is either a bug or an attempt.
        $expected = (int) round((float) $payment->amount * 100);

        if ($event['minor_units'] !== $expected || $event['currency'] !== $payment->currency) {
            Log::error('Webhook amount does not match the payment', [
                'gateway' => $gateway,
                'payment' => $payment->id,
                'expected' => $expected.' '.$payment->currency,
                'received' => $event['minor_units'].' '.$event['currency'],
            ]);

            return response()->json(['status' => 'amount mismatch'], 200);
        }

        Settlement::record($payment, $event['payment_id'], $event['raw']);

        return response()->json(['status' => 'ok'], 200);
    }
}
