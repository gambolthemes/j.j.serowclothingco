<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * What the payment profile does once an order exists: what gets frozen onto the
 * invoice, what the desk can see, and what must never reach the public page.
 */
class OrderBillingTest extends TestCase
{
    use RefreshDatabase;

    private User $retailer;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();

        $this->seed(CatalogSeeder::class);
        $this->retailer = User::create([
            'name' => 'Buyer', 'company' => 'Store',
            'email' => 'buyer@example.com', 'password' => 'passwordtest123',
        ]);
    }

    /** @return array<string, mixed> */
    private function line(): array
    {
        return [
            'product_id' => 'serow-oxford',
            'color_name' => 'White',
            'ratio' => ['M' => 1, 'L' => 1, 'XL' => 1, 'XXL' => 1],
            'sets' => 12,
        ];
    }

    private function place(): string
    {
        return $this->actingFresh($this->retailer)
            ->postJson('/api/account/orders', ['items' => [$this->line()]])
            ->assertCreated()
            ->json('order.code');
    }

    /**
     * An invoice records what was true on the day. A retailer correcting their
     * GSTIN next month must not silently rewrite invoices already filed.
     */
    public function test_the_billing_identity_is_frozen_onto_the_order(): void
    {
        $this->retailer->paymentProfile()->create([
            'legal_name' => 'Serow Retail Private Limited',
            'gstin' => '22AAAAA0000A1Z5',
        ]);

        $code = $this->place();

        $this->retailer->paymentProfile->update(['gstin' => '27BBBBB1111B2Z6']);

        $this->actingFresh($this->retailer)
            ->getJson("/api/account/orders/{$code}")
            ->assertOk()
            ->assertJsonPath('order.billing_profile.gstin', '22AAAAA0000A1Z5');
    }

    public function test_an_order_without_a_profile_carries_no_billing_block(): void
    {
        $code = $this->place();

        $this->actingFresh($this->retailer)
            ->getJson("/api/account/orders/{$code}")
            ->assertOk()
            ->assertJsonPath('order.billing_profile', null);
    }

    /** The bank account is for reconciliation, not for printing on an invoice. */
    public function test_the_snapshot_carries_tax_numbers_and_nothing_else(): void
    {
        $this->retailer->paymentProfile()->create([
            'gstin' => '22AAAAA0000A1Z5',
            'preferred_method' => 'neft',
            'bank_account_number' => '50100123456789',
            'bank_ifsc' => 'HDFC0001234',
        ]);

        $code = $this->place();
        $snapshot = $this->actingFresh($this->retailer)
            ->getJson("/api/account/orders/{$code}")
            ->json('order.billing_profile');

        $this->assertSame(['gstin'], array_keys($snapshot));
    }

    public function test_the_order_tells_the_retailer_where_to_pay(): void
    {
        Setting::putMany(['PAY_TO_UPI' => 'jjserow@okhdfcbank', 'COMPANY_GSTIN' => '33CCCCC2222C3Z7']);

        $code = $this->place();

        $this->actingFresh($this->retailer)
            ->getJson("/api/account/orders/{$code}")
            ->assertOk()
            ->assertJsonPath('order.pay_to.upi', 'jjserow@okhdfcbank');
    }

    /**
     * The page shell is printed for guests too, so our own account details must
     * not ride along in it.
     */
    public function test_the_public_page_never_carries_our_bank_details(): void
    {
        Setting::putMany([
            'PAY_TO_UPI' => 'jjserow@okhdfcbank',
            'PAY_TO_ACCOUNT_NUMBER' => '50100999888777',
            'COMPANY_GSTIN' => '33CCCCC2222C3Z7',
        ]);

        $body = $this->get('/')->assertOk()->getContent();

        $this->assertStringNotContainsString('50100999888777', $body);
        $this->assertStringNotContainsString('jjserow@okhdfcbank', $body);
        // The seller's GSTIN, by contrast, is on every invoice and stays public.
        $this->assertStringContainsString('33CCCCC2222C3Z7', $body);
    }

    public function test_the_desk_can_see_who_the_transfer_will_come_from(): void
    {
        $this->retailer->paymentProfile()->create([
            'preferred_method' => 'neft',
            'bank_account_name' => 'Serow Retail',
            'bank_account_number' => '50100123456789',
            'bank_ifsc' => 'HDFC0001234',
        ]);

        $code = $this->place();

        $admin = User::create([
            'name' => 'Staff', 'company' => 'J.J. Serow',
            'email' => 'staff@example.com', 'password' => 'passwordtest123',
        ]);
        $admin->forceFill(['is_admin' => true])->save();

        $this->actingFresh($admin)
            ->getJson("/api/admin/orders/{$code}")
            ->assertOk()
            ->assertJsonPath('order.payment_profile.bank_account_number', '50100123456789');

        $this->actingFresh($admin)
            ->getJson("/api/admin/retailers/{$this->retailer->id}")
            ->assertOk()
            ->assertJsonPath('retailer.payment_profile.method_label', 'NEFT');
    }
}
