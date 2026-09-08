<?php

namespace App\Support\Payments;

use App\Models\Order;
use App\Models\Payment;
use App\Models\Setting;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * PayPal, Orders v2 — for buyers outside India.
 *
 * PayPal stopped handling India-domestic payments in April 2021 and does not
 * settle INR cross-border, so this charges in USD at the rate staff set and is
 * only worth enabling if there are overseas buyers. See config/payments.php.
 *
 * The capture is made by us, server-side, after the buyer approves. The browser
 * saying "approved" is not payment; the capture call is.
 */
class PayPalGateway implements Gateway
{
    private const TOKEN_CACHE_KEY = 'paypal.access_token';

    public function key(): string
    {
        return 'paypal';
    }

    public function label(): string
    {
        return 'Pay with PayPal';
    }

    public function blurb(): string
    {
        return 'For buyers outside India — charged in '.$this->currency().'.';
    }

    public function currency(): string
    {
        return (string) config('payments.paypal.currency', 'USD');
    }

    /**
     * Needs a rate as well as keys: without one there is no honest way to turn a
     * rupee total into dollars, and guessing at it is somebody's money.
     */
    public function isEnabled(): bool
    {
        return filled(config('payments.paypal.client_id'))
            && filled(config('payments.paypal.secret'))
            && (float) Setting::get('PAYPAL_FX_RATE') > 0;
    }

    public function createOrder(Order $order, Charge $charge): array
    {
        $response = $this->request()->post('/v2/checkout/orders', [
            'intent' => 'CAPTURE',
            'purchase_units' => [[
                'reference_id' => $order->code,
                // Comes back on the webhook, so a capture can be traced to an
                // order even if our own ids were somehow lost.
                'custom_id' => $order->code,
                'description' => "J.J. Serow wholesale order {$order->code}",
                'amount' => [
                    'currency_code' => $charge->currency,
                    'value' => $charge->value(),
                ],
            ]],
        ]);

        if (! $response->successful() || ! $response->json('id')) {
            Log::error('PayPal order creation failed', [
                'code' => $order->code,
                'status' => $response->status(),
                'body' => $response->json(),
            ]);

            throw new RuntimeException('PayPal would not open a payment for this order.');
        }

        return [
            'id' => $response->json('id'),
            'client' => [
                'order_id' => $response->json('id'),
                'client_id' => (string) config('payments.paypal.client_id'),
                'currency' => $charge->currency,
                'amount' => $charge->value(),
                'sdk_url' => $this->sdkUrl($charge->currency),
            ],
        ];
    }

    public function confirm(Payment $payment, array $input): ?array
    {
        $orderId = (string) ($input['paypal_order_id'] ?? '');

        if ($orderId === '' || $orderId !== $payment->gateway_order_id) {
            return null;
        }

        return $this->capture($orderId, (float) $payment->amount, $payment->currency);
    }

    public function paidWebhook(Request $request): ?array
    {
        if (! $this->webhookIsGenuine($request)) {
            return null;
        }

        $event = (string) $request->json('event_type');
        $resource = (array) $request->json('resource', []);

        // The capture already happened — the ordinary case, and what settles a
        // payment whose buyer never made it back to the site.
        if ($event === 'PAYMENT.CAPTURE.COMPLETED') {
            $orderId = data_get($resource, 'supplementary_data.related_ids.order_id');

            if (! $orderId || empty($resource['id'])) {
                return null;
            }

            return [
                'gateway_order_id' => (string) $orderId,
                'payment_id' => (string) $resource['id'],
                'minor_units' => $this->minorUnits(data_get($resource, 'amount.value')),
                'currency' => (string) data_get($resource, 'amount.currency_code', $this->currency()),
                'raw' => $resource,
            ];
        }

        /*
         * Approved but not captured: the buyer closed the tab between approving
         * and our capture call. Without this the money is authorised and never
         * taken, and the order sits unpaid for no reason the retailer can see.
         */
        if ($event === 'CHECKOUT.ORDER.APPROVED' && ! empty($resource['id'])) {
            $payment = Payment::where('gateway', $this->key())
                ->where('gateway_order_id', $resource['id'])
                ->first();

            if (! $payment || $payment->isPaid()) {
                return null;
            }

            $captured = $this->capture(
                (string) $resource['id'],
                (float) $payment->amount,
                $payment->currency
            );

            return $captured === null ? null : [
                'gateway_order_id' => (string) $resource['id'],
                'payment_id' => $captured['payment_id'],
                'minor_units' => (int) round((float) $payment->amount * 100),
                'currency' => $payment->currency,
                'raw' => $captured['raw'],
            ];
        }

        return null;
    }

    /**
     * Takes the money, and checks PayPal took what we asked for. A capture that
     * came back for a different amount or currency is not this order's payment.
     *
     * @return array{payment_id: string, raw: array<string, mixed>}|null
     */
    private function capture(string $orderId, float $expected, string $currency): ?array
    {
        $response = $this->request()->post("/v2/checkout/orders/{$orderId}/capture");

        if (! $response->successful()) {
            Log::warning('PayPal capture failed', [
                'order' => $orderId,
                'status' => $response->status(),
                'body' => $response->json(),
            ]);

            return null;
        }

        $body = (array) $response->json();
        $capture = data_get($body, 'purchase_units.0.payments.captures.0');

        if (! $capture || ($capture['status'] ?? null) !== 'COMPLETED') {
            return null;
        }

        $paidMinor = $this->minorUnits(data_get($capture, 'amount.value'));
        $paidCurrency = (string) data_get($capture, 'amount.currency_code');

        if ($paidMinor !== (int) round($expected * 100) || $paidCurrency !== $currency) {
            Log::error('PayPal captured an unexpected amount', [
                'order' => $orderId,
                'expected' => $expected.' '.$currency,
                'captured' => data_get($capture, 'amount.value').' '.$paidCurrency,
            ]);

            return null;
        }

        return ['payment_id' => (string) $capture['id'], 'raw' => $body];
    }

    /**
     * PayPal verifies its own signatures, which means an API call — but it also
     * means we are not reimplementing their crypto and getting it subtly wrong.
     */
    private function webhookIsGenuine(Request $request): bool
    {
        $webhookId = (string) config('payments.paypal.webhook_id');

        if ($webhookId === '') {
            Log::warning('PayPal webhook rejected: no webhook id configured');

            return false;
        }

        $response = $this->request()->post('/v1/notifications/verify-webhook-signature', [
            'auth_algo' => $request->header('PAYPAL-AUTH-ALGO'),
            'cert_url' => $request->header('PAYPAL-CERT-URL'),
            'transmission_id' => $request->header('PAYPAL-TRANSMISSION-ID'),
            'transmission_sig' => $request->header('PAYPAL-TRANSMISSION-SIG'),
            'transmission_time' => $request->header('PAYPAL-TRANSMISSION-TIME'),
            'webhook_id' => $webhookId,
            'webhook_event' => $request->json()->all(),
        ]);

        $verified = $response->successful() && $response->json('verification_status') === 'SUCCESS';

        if (! $verified) {
            Log::warning('PayPal webhook failed verification', ['status' => $response->status()]);
        }

        return $verified;
    }

    /** "12.30" -> 1230. Done on the string so no float rounding creeps in. */
    private function minorUnits(mixed $value): int
    {
        return (int) round(((float) $value) * 100);
    }

    private function sdkUrl(string $currency): string
    {
        return config('payments.paypal.sdk_url').'?'.http_build_query([
            'client-id' => config('payments.paypal.client_id'),
            'currency' => $currency,
            // Wholesale orders are paid once, in full, on an invoice — the
            // pay-later and card-instalment buttons have no place here.
            'disable-funding' => 'paylater,credit',
            'intent' => 'capture',
        ]);
    }

    private function request(): PendingRequest
    {
        return Http::withToken($this->accessToken())
            ->acceptJson()
            ->baseUrl($this->baseUrl())
            ->timeout(20);
    }

    /**
     * OAuth token, cached just short of its own lifetime. PayPal rate-limits
     * token requests, and one per API call would earn that quickly.
     */
    private function accessToken(): string
    {
        return Cache::remember(self::TOKEN_CACHE_KEY, now()->addMinutes(25), function () {
            $response = Http::asForm()
                ->withBasicAuth(
                    (string) config('payments.paypal.client_id'),
                    (string) config('payments.paypal.secret')
                )
                ->acceptJson()
                ->timeout(20)
                ->post($this->baseUrl().'/v1/oauth2/token', ['grant_type' => 'client_credentials']);

            if (! $response->successful() || ! $response->json('access_token')) {
                throw new RuntimeException('PayPal would not issue an access token.');
            }

            return (string) $response->json('access_token');
        });
    }

    private function baseUrl(): string
    {
        $mode = config('payments.paypal.mode') === 'live' ? 'live' : 'sandbox';

        return (string) config("payments.paypal.base_urls.{$mode}");
    }
}
