<?php

namespace Tests\Feature;

use App\Mail\OrderStatusChanged;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Setting;
use App\Models\User;
use App\Support\Payments\Gateways;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Payments are the one place where a bug costs real money, so these lean on the
 * cases that would: a browser inventing its own amount, a webhook arriving
 * twice, an unsigned request, a capture that came back short.
 *
 * No gateway is contacted — Http::fake() stands in for both.
 */
class PaymentTest extends TestCase
{
    use RefreshDatabase;

    private const RAZORPAY_SECRET = 'razorpay-test-secret';

    private const WEBHOOK_SECRET = 'razorpay-webhook-secret';

    private User $retailer;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Gateways::flush();

        $this->seed(CatalogSeeder::class);

        config([
            'payments.razorpay.key' => 'rzp_test_key',
            'payments.razorpay.secret' => self::RAZORPAY_SECRET,
            'payments.razorpay.webhook_secret' => self::WEBHOOK_SECRET,
            'payments.paypal.client_id' => 'paypal-client',
            'payments.paypal.secret' => 'paypal-secret',
            'payments.paypal.webhook_id' => 'paypal-webhook-id',
            'payments.paypal.mode' => 'sandbox',
        ]);

        Setting::putMany(['PAYPAL_FX_RATE' => 80]);

        $this->retailer = User::create([
            'name' => 'Buyer', 'company' => 'Store',
            'email' => 'buyer@example.com', 'password' => 'passwordtest123',
        ]);
    }

    protected function tearDown(): void
    {
        Gateways::flush();
        parent::tearDown();
    }

    private function order(): Order
    {
        $this->actingFresh($this->retailer)->postJson('/api/account/orders', [
            'items' => [[
                'product_id' => 'serow-oxford',
                'color_name' => 'White',
                'ratio' => ['M' => 1, 'L' => 1, 'XL' => 1, 'XXL' => 1],
                'sets' => 12,
            ]],
        ])->assertCreated();

        return $this->retailer->orders()->latest('id')->firstOrFail();
    }

    /* ---------------------------------------------------------------- razorpay */

    private function fakeRazorpay(string $orderId = 'order_RZP123'): void
    {
        Http::fake([
            'api.razorpay.com/v1/orders' => Http::response(['id' => $orderId], 200),
        ]);
    }

    private function razorpaySignature(string $orderId, string $paymentId): string
    {
        return hash_hmac('sha256', "{$orderId}|{$paymentId}", self::RAZORPAY_SECRET);
    }

    private function start(Order $order, string $gateway = 'razorpay')
    {
        return $this->actingFresh($this->retailer)
            ->postJson("/api/account/orders/{$order->code}/pay", ['gateway' => $gateway]);
    }

    public function test_opening_a_payment_charges_the_order_total_and_never_the_clients(): void
    {
        $this->fakeRazorpay();
        $order = $this->order();

        // The request carries no amount at all, and could not be believed if it did.
        $this->actingFresh($this->retailer)
            ->postJson("/api/account/orders/{$order->code}/pay", [
                'gateway' => 'razorpay',
                'amount' => 1,
            ])
            ->assertCreated()
            ->assertJsonPath('client.amount', (int) round((float) $order->total * 100))
            ->assertJsonPath('client.currency', 'INR');

        Http::assertSent(fn ($request) => $request['amount'] === (int) round((float) $order->total * 100));
    }

    public function test_the_publishable_key_goes_to_the_browser_and_the_secret_does_not(): void
    {
        $this->fakeRazorpay();
        $body = $this->start($this->order())->assertCreated()->json();

        $this->assertSame('rzp_test_key', $body['client']['key']);
        $this->assertStringNotContainsString(self::RAZORPAY_SECRET, json_encode($body));
    }

    public function test_a_signed_callback_marks_the_order_paid(): void
    {
        $this->fakeRazorpay();
        $order = $this->order();
        $this->start($order)->assertCreated();

        $this->actingFresh($this->retailer)
            ->postJson("/api/account/orders/{$order->code}/pay/confirm", [
                'gateway' => 'razorpay',
                'gateway_order_id' => 'order_RZP123',
                'payload' => [
                    'razorpay_order_id' => 'order_RZP123',
                    'razorpay_payment_id' => 'pay_ABC',
                    'razorpay_signature' => $this->razorpaySignature('order_RZP123', 'pay_ABC'),
                ],
            ])
            ->assertOk()
            ->assertJsonPath('status', 'paid');

        $this->assertSame('payment_received', $order->fresh()->status);
        $this->assertDatabaseHas('payments', ['gateway_payment_id' => 'pay_ABC', 'status' => 'paid']);
        Mail::assertQueued(OrderStatusChanged::class);
    }

    /* A forged callback is the obvious attack: it costs nothing to try and the
       prize is a free order. The signature is the only thing that stops it. */
    public function test_an_unsigned_callback_is_refused_and_the_order_stays_unpaid(): void
    {
        $this->fakeRazorpay();
        $order = $this->order();
        $this->start($order)->assertCreated();

        $this->actingFresh($this->retailer)
            ->postJson("/api/account/orders/{$order->code}/pay/confirm", [
                'gateway' => 'razorpay',
                'gateway_order_id' => 'order_RZP123',
                'payload' => [
                    'razorpay_order_id' => 'order_RZP123',
                    'razorpay_payment_id' => 'pay_ABC',
                    'razorpay_signature' => 'not-a-real-signature',
                ],
            ])
            ->assertStatus(422);

        $this->assertSame('placed', $order->fresh()->status);
        $this->assertDatabaseHas('payments', ['status' => 'failed']);
        Mail::assertNotQueued(OrderStatusChanged::class);
    }

    public function test_a_callback_cannot_settle_another_retailers_order(): void
    {
        $this->fakeRazorpay();
        $order = $this->order();
        $this->start($order)->assertCreated();

        $stranger = User::create([
            'name' => 'Other', 'company' => 'Other Store',
            'email' => 'other@example.com', 'password' => 'passwordtest123',
        ]);

        $this->actingFresh($stranger)
            ->postJson("/api/account/orders/{$order->code}/pay/confirm", [
                'gateway' => 'razorpay',
                'gateway_order_id' => 'order_RZP123',
                'payload' => [
                    'razorpay_order_id' => 'order_RZP123',
                    'razorpay_payment_id' => 'pay_ABC',
                    'razorpay_signature' => $this->razorpaySignature('order_RZP123', 'pay_ABC'),
                ],
            ])
            ->assertNotFound();

        $this->assertSame('placed', $order->fresh()->status);
    }

    public function test_an_order_cannot_be_paid_twice(): void
    {
        $this->fakeRazorpay();
        $order = $this->order();
        $this->start($order)->assertCreated();

        $confirm = fn () => $this->actingFresh($this->retailer)
            ->postJson("/api/account/orders/{$order->code}/pay/confirm", [
                'gateway' => 'razorpay',
                'gateway_order_id' => 'order_RZP123',
                'payload' => [
                    'razorpay_order_id' => 'order_RZP123',
                    'razorpay_payment_id' => 'pay_ABC',
                    'razorpay_signature' => $this->razorpaySignature('order_RZP123', 'pay_ABC'),
                ],
            ]);

        $confirm()->assertOk();
        $confirm()->assertOk();

        // One status event, one email — not two of either.
        $this->assertSame(2, $order->statusEvents()->count(), 'placed + payment_received');
        Mail::assertQueuedCount(2); // the order confirmation, and one payment mail
    }

    public function test_a_paid_order_refuses_a_second_payment_attempt(): void
    {
        $this->fakeRazorpay();
        $order = $this->order();
        $order->update(['status' => 'payment_received']);

        $this->start($order)->assertStatus(422);
    }

    public function test_a_cancelled_order_cannot_be_paid(): void
    {
        $this->fakeRazorpay();
        $order = $this->order();
        $order->update(['status' => 'cancelled']);

        $this->start($order)->assertStatus(422);
    }

    public function test_guests_cannot_open_a_payment(): void
    {
        $this->fakeRazorpay();
        $order = $this->order();

        // flushSession() alone is not enough: actingAs() also pins a user onto
        // the guard for the rest of the test, and that has to go too.
        $this->app['auth']->forgetGuards();
        $this->flushSession();

        $this->postJson("/api/account/orders/{$order->code}/pay", ['gateway' => 'razorpay'])
            ->assertUnauthorized();
    }

    public function test_a_gateway_that_is_not_configured_is_not_offered(): void
    {
        config(['payments.razorpay.key' => null, 'payments.razorpay.secret' => null]);
        Gateways::flush();

        $order = $this->order();

        $this->start($order)->assertStatus(422);

        $this->actingFresh($this->retailer)
            ->getJson("/api/account/orders/{$order->code}")
            ->assertOk()
            ->assertJsonCount(1, 'order.payment_options');
    }

    /*
     * Switching a gateway off means "stop offering this", not "abandon money
     * already taken". A payment opened while it was on must still be
     * finishable, or a buyer ends up charged with an order that never moves.
     */
    public function test_a_payment_in_flight_still_settles_after_its_gateway_is_switched_off(): void
    {
        $this->fakeRazorpay();
        $order = $this->order();
        $this->start($order)->assertCreated();

        // The keys go, but the webhook secret stays — exactly what happens when
        // staff pull a gateway while a buyer is mid-checkout.
        config(['payments.razorpay.key' => null, 'payments.razorpay.secret' => null]);
        Gateways::flush();

        $this->razorpayWebhook(
            $this->capturedEvent('order_RZP123', 'pay_HOOK', (int) round((float) $order->total * 100))
        )->assertOk()->assertJsonPath('status', 'ok');

        $this->assertSame('payment_received', $order->fresh()->status);
    }

    /* ---------------------------------------------------------------- webhooks */

    private function razorpayWebhook(array $body): \Illuminate\Testing\TestResponse
    {
        $json = json_encode($body);

        return $this->call(
            'POST',
            '/webhooks/razorpay',
            server: [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_X_RAZORPAY_SIGNATURE' => hash_hmac('sha256', $json, self::WEBHOOK_SECRET),
            ],
            content: $json
        );
    }

    private function capturedEvent(string $orderId, string $paymentId, int $minor): array
    {
        return [
            'event' => 'payment.captured',
            'payload' => ['payment' => ['entity' => [
                'id' => $paymentId,
                'order_id' => $orderId,
                'amount' => $minor,
                'currency' => 'INR',
            ]]],
        ];
    }

    public function test_a_webhook_settles_an_order_whose_buyer_never_came_back(): void
    {
        $this->fakeRazorpay();
        $order = $this->order();
        $this->start($order)->assertCreated();

        $minor = (int) round((float) $order->total * 100);

        $this->razorpayWebhook($this->capturedEvent('order_RZP123', 'pay_HOOK', $minor))
            ->assertOk()
            ->assertJsonPath('status', 'ok');

        $this->assertSame('payment_received', $order->fresh()->status);
    }

    public function test_an_unsigned_webhook_changes_nothing(): void
    {
        $this->fakeRazorpay();
        $order = $this->order();
        $this->start($order)->assertCreated();

        $minor = (int) round((float) $order->total * 100);

        $this->call(
            'POST',
            '/webhooks/razorpay',
            server: [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_X_RAZORPAY_SIGNATURE' => 'forged',
            ],
            content: json_encode($this->capturedEvent('order_RZP123', 'pay_HOOK', $minor))
        )->assertOk()->assertJsonPath('status', 'ignored');

        $this->assertSame('placed', $order->fresh()->status);
    }

    /* A signed webhook quoting the wrong amount is either our bug or someone
       replaying a cheaper payment. Neither is settled quietly. */
    public function test_a_webhook_for_the_wrong_amount_is_refused(): void
    {
        $this->fakeRazorpay();
        $order = $this->order();
        $this->start($order)->assertCreated();

        $this->razorpayWebhook($this->capturedEvent('order_RZP123', 'pay_HOOK', 100))
            ->assertOk()
            ->assertJsonPath('status', 'amount mismatch');

        $this->assertSame('placed', $order->fresh()->status);
    }

    public function test_a_replayed_webhook_does_not_email_the_retailer_twice(): void
    {
        $this->fakeRazorpay();
        $order = $this->order();
        $this->start($order)->assertCreated();

        $event = $this->capturedEvent('order_RZP123', 'pay_HOOK', (int) round((float) $order->total * 100));

        $this->razorpayWebhook($event)->assertOk();
        $this->razorpayWebhook($event)->assertOk();

        $this->assertSame(2, $order->statusEvents()->count());
        Mail::assertQueuedCount(2);
    }

    public function test_a_late_webhook_does_not_drag_an_order_out_of_production(): void
    {
        $this->fakeRazorpay();
        $order = $this->order();
        $this->start($order)->assertCreated();

        $order->update(['status' => 'stitching']);

        $this->razorpayWebhook(
            $this->capturedEvent('order_RZP123', 'pay_HOOK', (int) round((float) $order->total * 100))
        )->assertOk();

        $this->assertSame('stitching', $order->fresh()->status);
    }

    public function test_a_webhook_for_an_unknown_payment_is_shrugged_off(): void
    {
        $this->fakeRazorpay();

        $this->razorpayWebhook($this->capturedEvent('order_NOPE', 'pay_X', 100))
            ->assertOk()
            ->assertJsonPath('status', 'unknown payment');
    }

    /* ------------------------------------------------------------------ paypal */

    public function test_paypal_charges_in_dollars_at_the_rate_staff_set(): void
    {
        Http::fake([
            'api-m.sandbox.paypal.com/v1/oauth2/token' => Http::response(['access_token' => 'tok'], 200),
            'api-m.sandbox.paypal.com/v2/checkout/orders' => Http::response(['id' => 'PPORDER1'], 201),
        ]);

        $order = $this->order();
        $expected = number_format(round((float) $order->total / 80, 2), 2, '.', '');

        $this->start($order, 'paypal')
            ->assertCreated()
            ->assertJsonPath('client.currency', 'USD')
            ->assertJsonPath('client.amount', $expected);

        $this->assertDatabaseHas('payments', [
            'gateway' => 'paypal',
            'currency' => 'USD',
            'fx_rate' => '80.0000',
            'amount_inr' => number_format((float) $order->total, 2, '.', ''),
        ]);
    }

    /* Without a rate there is no honest dollar figure, so the button is not
       offered at all rather than guessing at somebody's money. */
    public function test_paypal_is_hidden_until_an_exchange_rate_is_set(): void
    {
        Setting::putMany(['PAYPAL_FX_RATE' => 0]);
        Gateways::flush();

        $order = $this->order();

        $this->start($order, 'paypal')->assertStatus(422);

        $options = $this->actingFresh($this->retailer)
            ->getJson("/api/account/orders/{$order->code}")
            ->json('order.payment_options');

        $this->assertSame(['razorpay'], array_column($options, 'key'));
    }

    public function test_a_paypal_capture_that_comes_back_short_is_not_accepted(): void
    {
        Http::fake([
            'api-m.sandbox.paypal.com/v1/oauth2/token' => Http::response(['access_token' => 'tok'], 200),
            'api-m.sandbox.paypal.com/v2/checkout/orders' => Http::response(['id' => 'PPORDER1'], 201),
            'api-m.sandbox.paypal.com/v2/checkout/orders/PPORDER1/capture' => Http::response([
                'purchase_units' => [[
                    'payments' => ['captures' => [[
                        'id' => 'CAP1',
                        'status' => 'COMPLETED',
                        // A dollar, against an order worth far more.
                        'amount' => ['value' => '1.00', 'currency_code' => 'USD'],
                    ]]],
                ]],
            ], 201),
        ]);

        $order = $this->order();
        $this->start($order, 'paypal')->assertCreated();

        $this->actingFresh($this->retailer)
            ->postJson("/api/account/orders/{$order->code}/pay/confirm", [
                'gateway' => 'paypal',
                'gateway_order_id' => 'PPORDER1',
                'payload' => ['paypal_order_id' => 'PPORDER1'],
            ])
            ->assertStatus(422);

        $this->assertSame('placed', $order->fresh()->status);
    }

    public function test_a_completed_paypal_capture_settles_the_order(): void
    {
        $order = $this->order();
        $usd = number_format(round((float) $order->total / 80, 2), 2, '.', '');

        Http::fake([
            'api-m.sandbox.paypal.com/v1/oauth2/token' => Http::response(['access_token' => 'tok'], 200),
            'api-m.sandbox.paypal.com/v2/checkout/orders' => Http::response(['id' => 'PPORDER1'], 201),
            'api-m.sandbox.paypal.com/v2/checkout/orders/PPORDER1/capture' => Http::response([
                'purchase_units' => [[
                    'payments' => ['captures' => [[
                        'id' => 'CAP1',
                        'status' => 'COMPLETED',
                        'amount' => ['value' => $usd, 'currency_code' => 'USD'],
                    ]]],
                ]],
            ], 201),
        ]);

        $this->start($order, 'paypal')->assertCreated();

        $this->actingFresh($this->retailer)
            ->postJson("/api/account/orders/{$order->code}/pay/confirm", [
                'gateway' => 'paypal',
                'gateway_order_id' => 'PPORDER1',
                'payload' => ['paypal_order_id' => 'PPORDER1'],
            ])
            ->assertOk()
            ->assertJsonPath('status', 'paid');

        $this->assertSame('payment_received', $order->fresh()->status);
        $this->assertDatabaseHas('payments', ['gateway_payment_id' => 'CAP1', 'status' => 'paid']);
    }

    /* ------------------------------------------------------------------- admin */

    public function test_the_desk_can_see_what_was_paid_and_how(): void
    {
        $this->fakeRazorpay();
        $order = $this->order();
        $this->start($order)->assertCreated();

        $this->razorpayWebhook(
            $this->capturedEvent('order_RZP123', 'pay_HOOK', (int) round((float) $order->total * 100))
        )->assertOk();

        $admin = User::create([
            'name' => 'Staff', 'company' => 'J.J. Serow',
            'email' => 'staff@example.com', 'password' => 'passwordtest123',
        ]);
        $admin->forceFill(['is_admin' => true])->save();

        $this->actingFresh($admin)
            ->getJson("/api/admin/orders/{$order->code}")
            ->assertOk()
            ->assertJsonPath('order.payments.0.gateway', 'razorpay')
            ->assertJsonPath('order.payments.0.status', Payment::PAID)
            ->assertJsonPath('order.payments.0.reference', 'pay_HOOK');
    }
}
