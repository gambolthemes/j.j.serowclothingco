<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Models\Payment;
use App\Models\Setting;
use App\Support\Payments\Gateways;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Proves the payment setup actually works, against the real sandboxes.
 *
 * The test suite fakes both gateways, which is right for testing our own logic
 * and useless for telling you whether the keys in .env are the correct ones.
 * This does the opposite: it makes real calls and reports what came back.
 *
 *   php artisan payments:check                 config + a live call to each gateway
 *   php artisan payments:check --webhook=JS-42 sign a webhook and post it at ourselves
 *
 * Test credentials only unless --force is given: creating orders is harmless in
 * a sandbox and is not something to do by accident against live keys.
 */
class CheckPayments extends Command
{
    protected $signature = 'payments:check
                            {--webhook= : Order code to fire a signed test webhook at}
                            {--force : Allow running against live credentials}';

    protected $description = 'Check the payment gateways against their sandboxes';

    public function handle(): int
    {
        Gateways::flush();

        $this->configuration();

        if ($code = $this->option('webhook')) {
            return $this->fireWebhook($code);
        }

        $enabled = Gateways::enabled();

        if ($enabled === []) {
            $this->newLine();
            $this->warn('No gateway is configured, so there is nothing to check.');
            $this->line('Retailers pay by transfer and no pay button appears — which is a valid setup.');

            return self::SUCCESS;
        }

        $ok = true;

        foreach ($enabled as $gateway) {
            $ok = match ($gateway->key()) {
                'razorpay' => $this->checkRazorpay(),
                'paypal' => $this->checkPayPal(),
                default => true,
            } && $ok;
        }

        $this->newLine();
        $this->webhookReminder();

        return $ok ? self::SUCCESS : self::FAILURE;
    }

    private function configuration(): void
    {
        $this->components->info('Configuration');

        $razorpayKey = (string) config('payments.razorpay.key');
        $paypalMode = (string) config('payments.paypal.mode');

        $this->components->twoColumnDetail(
            'Razorpay keys',
            $razorpayKey === '' ? '<fg=gray>not set</>' : $this->mask($razorpayKey)
        );
        $this->components->twoColumnDetail(
            'Razorpay webhook secret',
            filled(config('payments.razorpay.webhook_secret')) ? '<fg=green>set</>' : '<fg=yellow>missing</>'
        );
        $this->components->twoColumnDetail(
            'PayPal keys',
            filled(config('payments.paypal.client_id')) ? '<fg=green>set</>' : '<fg=gray>not set</>'
        );
        $this->components->twoColumnDetail(
            'PayPal mode',
            $paypalMode === 'live' ? '<fg=red>LIVE</>' : '<fg=green>sandbox</>'
        );
        $this->components->twoColumnDetail(
            'PayPal webhook id',
            filled(config('payments.paypal.webhook_id')) ? '<fg=green>set</>' : '<fg=yellow>missing</>'
        );

        $rate = (float) Setting::get('PAYPAL_FX_RATE');
        $this->components->twoColumnDetail(
            'PayPal rate (₹ per 1 '.config('payments.paypal.currency').')',
            $rate > 0 ? (string) $rate : '<fg=yellow>0 — PayPal stays hidden</>'
        );

        $this->newLine();
        $this->components->info('Offered to retailers');

        $options = Gateways::options();

        if ($options === []) {
            $this->components->twoColumnDetail('<fg=gray>none</>', '');
        }

        foreach ($options as $option) {
            $this->components->twoColumnDetail($option['label'], $option['currency']);
        }

        $this->newLine();
    }

    private function checkRazorpay(): bool
    {
        $key = (string) config('payments.razorpay.key');

        if (! str_starts_with($key, 'rzp_test_') && ! $this->option('force')) {
            $this->components->error('Razorpay key is not a test key. Re-run with --force to use it anyway.');

            return false;
        }

        return $this->attempt('Razorpay: creating a ₹1 test order', function () {
            $response = Http::withBasicAuth(
                (string) config('payments.razorpay.key'),
                (string) config('payments.razorpay.secret')
            )
                ->acceptJson()
                ->timeout(20)
                ->post(config('payments.razorpay.base_url').'/v1/orders', [
                    'amount' => 100,
                    'currency' => 'INR',
                    'receipt' => 'healthcheck-'.now()->timestamp,
                ]);

            if (! $response->successful()) {
                throw new \RuntimeException(
                    'HTTP '.$response->status().' — '.($response->json('error.description') ?? 'no detail')
                );
            }

            return 'order '.$response->json('id');
        });
    }

    private function checkPayPal(): bool
    {
        if (config('payments.paypal.mode') === 'live' && ! $this->option('force')) {
            $this->components->error('PayPal is in live mode. Re-run with --force to use it anyway.');

            return false;
        }

        $base = (string) config('payments.paypal.base_urls.'.config('payments.paypal.mode'));

        $token = null;

        $gotToken = $this->attempt('PayPal: requesting an access token', function () use ($base, &$token) {
            $response = Http::asForm()
                ->withBasicAuth(
                    (string) config('payments.paypal.client_id'),
                    (string) config('payments.paypal.secret')
                )
                ->acceptJson()
                ->timeout(20)
                ->post($base.'/v1/oauth2/token', ['grant_type' => 'client_credentials']);

            if (! $response->successful()) {
                throw new \RuntimeException(
                    'HTTP '.$response->status().' — '.($response->json('error_description') ?? 'check the client id and secret')
                );
            }

            $token = $response->json('access_token');

            return 'token issued';
        });

        if (! $gotToken) {
            return false;
        }

        return $this->attempt('PayPal: creating a $1 sandbox order', function () use ($base, $token) {
            $response = Http::withToken($token)
                ->acceptJson()
                ->timeout(20)
                ->post($base.'/v2/checkout/orders', [
                    'intent' => 'CAPTURE',
                    'purchase_units' => [[
                        'amount' => [
                            'currency_code' => config('payments.paypal.currency'),
                            'value' => '1.00',
                        ],
                    ]],
                ]);

            if (! $response->successful()) {
                throw new \RuntimeException(
                    'HTTP '.$response->status().' — '.($response->json('message') ?? 'no detail')
                );
            }

            return 'order '.$response->json('id');
        });
    }

    /**
     * Signs a payment.captured event the way Razorpay would and posts it at our
     * own webhook route. Proves the whole path — signature check, amount check,
     * settlement, the order moving — without waiting on a real buyer.
     */
    private function fireWebhook(string $code): int
    {
        $secret = (string) config('payments.razorpay.webhook_secret');

        if ($secret === '') {
            $this->components->error('No RAZORPAY_WEBHOOK_SECRET set — the endpoint would reject this.');

            return self::FAILURE;
        }

        $order = Order::where('code', strtoupper(trim($code)))->first();

        if (! $order) {
            $this->components->error("No order {$code}.");

            return self::FAILURE;
        }

        $payment = $order->payments()->where('gateway', 'razorpay')->latest('id')->first();

        if (! $payment) {
            // Stands in for the row the browser would have created by opening a
            // payment, so the webhook has something to land on.
            $payment = $order->payments()->create([
                'gateway' => 'razorpay',
                'gateway_order_id' => 'order_LOCAL'.now()->timestamp,
                'status' => Payment::CREATED,
                'amount' => $order->total,
                'currency' => 'INR',
                'amount_inr' => $order->total,
            ]);

            $this->components->info("Opened a stand-in payment {$payment->gateway_order_id}");
        }

        $body = json_encode([
            'event' => 'payment.captured',
            'payload' => ['payment' => ['entity' => [
                'id' => 'pay_LOCAL'.now()->timestamp,
                'order_id' => $payment->gateway_order_id,
                'amount' => (int) round((float) $payment->amount * 100),
                'currency' => 'INR',
            ]]],
        ]);

        $url = rtrim((string) config('app.url'), '/').'/webhooks/razorpay';

        $this->components->info("Posting a signed webhook at {$url}");
        $this->components->twoColumnDetail('Order', $order->code.' — '.$order->status);

        $response = Http::withHeaders([
            'Content-Type' => 'application/json',
            'X-Razorpay-Signature' => hash_hmac('sha256', $body, $secret),
        ])->withBody($body, 'application/json')->timeout(20)->post($url);

        $this->components->twoColumnDetail('Response', $response->status().' '.$response->body());
        $this->components->twoColumnDetail('Order now', $order->fresh()->status);

        $settled = $order->fresh()->status === 'payment_received';

        $this->newLine();

        if ($settled) {
            $this->components->info('Webhook path works end to end.');
        } else {
            $this->components->error('The order did not move. Check the response above and the log.');
        }

        return $settled ? self::SUCCESS : self::FAILURE;
    }

    private function attempt(string $label, callable $work): bool
    {
        try {
            $this->components->twoColumnDetail($label, '<fg=green>'.$work().'</>');

            return true;
        } catch (Throwable $e) {
            $this->components->twoColumnDetail($label, '<fg=red>failed</>');
            $this->components->error($e->getMessage());

            return false;
        }
    }

    private function webhookReminder(): void
    {
        $base = rtrim((string) config('app.url'), '/');

        $this->components->info('Register these webhooks in the gateway dashboards');
        $this->components->twoColumnDetail($base.'/webhooks/razorpay', 'payment.captured');
        $this->components->twoColumnDetail(
            $base.'/webhooks/paypal',
            'PAYMENT.CAPTURE.COMPLETED, CHECKOUT.ORDER.APPROVED'
        );
        $this->line('  A gateway cannot reach localhost — use a tunnel (ngrok, Herd share) while testing.');
    }

    private function mask(string $value): string
    {
        return strlen($value) <= 12 ? $value : substr($value, 0, 12).str_repeat('•', 6);
    }
}
