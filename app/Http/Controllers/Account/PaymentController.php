<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Support\Payments\Charge;
use App\Support\Payments\Gateways;
use App\Support\Payments\Settlement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

/**
 * Paying an order online. Two steps, because that is how both gateways work:
 * open a payment here, let the buyer approve it in the gateway's own UI, then
 * come back so the result can be verified.
 *
 * The amount is never in either request. It comes off the order every time — a
 * client that could name its own figure is a client that pays ₹1 for a
 * ₹1,50,000 order.
 */
class PaymentController extends Controller
{
    public function start(Request $request, string $code): JsonResponse
    {
        $data = $request->validate([
            'gateway' => ['required', 'string', 'max:20'],
        ]);

        $order = $this->payableOrder($request, $code);

        if ($order instanceof JsonResponse) {
            return $order;
        }

        $gateway = Gateways::find($data['gateway']);

        if (! $gateway) {
            return response()->json(['message' => 'That payment method is not available.'], 422);
        }

        try {
            $charge = Charge::forOrder($order, $gateway->currency());
            $remote = $gateway->createOrder($order, $charge);
        } catch (RuntimeException $e) {
            // The gateway refused, or is misconfigured. Either way the retailer
            // still has the bank-transfer route, so say so plainly.
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $payment = $order->payments()->create([
            'gateway' => $gateway->key(),
            'gateway_order_id' => $remote['id'],
            'status' => Payment::CREATED,
            'amount' => $charge->amount,
            'currency' => $charge->currency,
            'amount_inr' => $charge->amountInr,
            'fx_rate' => $charge->fxRate,
        ]);

        return response()->json([
            'payment' => $payment->payload(),
            'gateway' => $gateway->key(),
            'client' => $remote['client'],
        ], 201);
    }

    /**
     * The browser reporting back after the buyer approved. Whatever it says is
     * checked against the gateway — Razorpay's callback is signed, and PayPal
     * is asked to capture — so this is never taken on trust.
     */
    public function confirm(Request $request, string $code): JsonResponse
    {
        $data = $request->validate([
            'gateway' => ['required', 'string', 'max:20'],
            'gateway_order_id' => ['required', 'string', 'max:120'],
            'payload' => ['array'],
        ]);

        $order = $request->user()->orders()->where('code', strtoupper(trim($code)))->firstOrFail();

        // Same reason as the webhook: a payment opened while a gateway was on
        // has to be finishable after it is switched off. Only `start` below
        // asks whether a gateway may still be offered.
        $gateway = Gateways::handler($data['gateway']);

        $payment = $order->payments()
            ->where('gateway', $data['gateway'])
            ->where('gateway_order_id', $data['gateway_order_id'])
            ->first();

        if (! $gateway || ! $payment) {
            return response()->json(['message' => 'That payment does not belong to this order.'], 422);
        }

        // The webhook may have got here first. That is a success, not a clash.
        if ($payment->isPaid()) {
            return response()->json(['status' => 'paid', 'payment' => $payment->payload()]);
        }

        $verified = $gateway->confirm($payment, $data['payload'] ?? []);

        if (! $verified) {
            Settlement::fail($payment, $data['payload'] ?? []);

            return response()->json([
                'message' => 'We could not verify that payment. If money left your account, '
                    .'send us the reference on WhatsApp and we will sort it out.',
            ], 422);
        }

        Settlement::record($payment, $verified['payment_id'], $verified['raw']);

        return response()->json([
            'status' => 'paid',
            'payment' => $payment->fresh()->payload(),
        ]);
    }

    /**
     * The retailer's own order, if it is actually payable.
     *
     * @return Order|JsonResponse
     */
    private function payableOrder(Request $request, string $code)
    {
        $order = $request->user()->orders()->where('code', strtoupper(trim($code)))->firstOrFail();

        if ($order->status === 'cancelled') {
            return response()->json(['message' => 'This order was cancelled.'], 422);
        }

        // Anything past "placed" has already been paid for — an order does not
        // reach the cutting floor otherwise.
        if ($order->status !== 'placed') {
            return response()->json(['message' => 'This order is already paid.'], 422);
        }

        return $order;
    }
}
