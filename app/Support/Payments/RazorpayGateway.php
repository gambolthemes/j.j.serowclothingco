<?php

namespace App\Support\Payments;

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Razorpay — the domestic gateway. UPI, netbanking, cards and wallets, in INR.
 *
 * Talked to over plain HTTP rather than through their SDK: the two calls used
 * here are a POST and an HMAC comparison, and a dependency that has to be kept
 * patched is a poor trade for that.
 */
class RazorpayGateway implements Gateway
{
    public function key(): string
    {
        return 'razorpay';
    }

    public function label(): string
    {
        return 'Pay in rupees';
    }

    public function blurb(): string
    {
        return 'UPI, netbanking, card or wallet — settled in INR.';
    }

    public function currency(): string
    {
        return 'INR';
    }

    public function isEnabled(): bool
    {
        return filled($this->config('key')) && filled($this->config('secret'));
    }

    public function createOrder(Order $order, Charge $charge): array
    {
        $response = $this->request()->post('/v1/orders', [
            'amount' => $charge->minorUnits(),
            'currency' => $charge->currency,
            // Shown in the Razorpay dashboard, so a payment can be matched to an
            // order without going through this database.
            'receipt' => $order->code,
            'notes' => ['order_code' => $order->code],
        ]);

        if (! $response->successful() || ! $response->json('id')) {
            Log::error('Razorpay order creation failed', [
                'code' => $order->code,
                'status' => $response->status(),
                'body' => $response->json(),
            ]);

            throw new RuntimeException('Razorpay would not open a payment for this order.');
        }

        return [
            'id' => $response->json('id'),
            'client' => [
                // The publishable key only. The secret signs and verifies, and
                // never leaves the server.
                'key' => $this->config('key'),
                'order_id' => $response->json('id'),
                'amount' => $charge->minorUnits(),
                'currency' => $charge->currency,
                'name' => 'J.J. Serow Clothing Co.',
                'description' => "Order {$order->code}",
            ],
        ];
    }

    public function confirm(Payment $payment, array $input): ?array
    {
        $orderId = (string) ($input['razorpay_order_id'] ?? '');
        $paymentId = (string) ($input['razorpay_payment_id'] ?? '');
        $signature = (string) ($input['razorpay_signature'] ?? '');

        // The signature covers the order id, so a callback quoting someone
        // else's payment against this order cannot verify.
        if ($orderId === '' || $paymentId === '' || $orderId !== $payment->gateway_order_id) {
            return null;
        }

        if (! $this->signatureMatches("{$orderId}|{$paymentId}", $signature, (string) $this->config('secret'))) {
            Log::warning('Razorpay callback failed signature check', [
                'payment' => $payment->id,
                'order' => $orderId,
            ]);

            return null;
        }

        return ['payment_id' => $paymentId, 'raw' => $input];
    }

    public function paidWebhook(Request $request): ?array
    {
        $secret = (string) $this->config('webhook_secret');

        // No secret means no way to tell Razorpay apart from anyone else who
        // found the URL, so the endpoint stays shut rather than trusting.
        if ($secret === '') {
            Log::warning('Razorpay webhook rejected: no webhook secret configured');

            return null;
        }

        // Signed over the raw body, so it has to be the bytes as received —
        // re-encoding the parsed JSON would change them.
        $body = $request->getContent();

        if (! $this->signatureMatches($body, (string) $request->header('X-Razorpay-Signature'), $secret)) {
            Log::warning('Razorpay webhook failed signature check');

            return null;
        }

        $event = $request->json('event');

        if ($event !== 'payment.captured') {
            return null;
        }

        $entity = (array) $request->json('payload.payment.entity', []);

        if (empty($entity['order_id']) || empty($entity['id'])) {
            return null;
        }

        return [
            'gateway_order_id' => (string) $entity['order_id'],
            'payment_id' => (string) $entity['id'],
            'minor_units' => (int) ($entity['amount'] ?? 0),
            'currency' => (string) ($entity['currency'] ?? 'INR'),
            'raw' => $entity,
        ];
    }

    /** Constant-time, so a wrong signature cannot be narrowed down by timing. */
    private function signatureMatches(string $payload, string $signature, string $secret): bool
    {
        return $signature !== ''
            && hash_equals(hash_hmac('sha256', $payload, $secret), $signature);
    }

    private function request()
    {
        return Http::withBasicAuth((string) $this->config('key'), (string) $this->config('secret'))
            ->acceptJson()
            ->baseUrl((string) $this->config('base_url'))
            ->timeout(20);
    }

    private function config(string $key): mixed
    {
        return config("payments.razorpay.{$key}");
    }
}
