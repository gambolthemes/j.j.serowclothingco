<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentProfileTest extends TestCase
{
    use RefreshDatabase;

    private function retailer(string $email = 'buyer@example.com'): User
    {
        return User::create([
            'name' => 'Buyer', 'company' => 'Store',
            'email' => $email, 'password' => 'passwordtest123',
        ]);
    }

    /** @return array<string, mixed> */
    private function profile(array $overrides = []): array
    {
        return array_merge([
            'legal_name' => 'Serow Retail Private Limited',
            'gstin' => '22AAAAA0000A1Z5',
            'pan' => 'AAAAA0000A',
            'preferred_method' => 'upi',
            'upi_id' => 'serowretail@okhdfcbank',
        ], $overrides);
    }

    public function test_the_payment_screen_is_closed_to_guests(): void
    {
        $this->getJson('/api/account/payment')->assertUnauthorized();
        $this->putJson('/api/account/payment', $this->profile())->assertUnauthorized();
    }

    public function test_a_new_retailer_gets_an_empty_profile_with_every_key(): void
    {
        $this->actingAs($this->retailer())
            ->getJson('/api/account/payment')
            ->assertOk()
            ->assertJsonPath('profile.gstin', null)
            ->assertJsonPath('profile.preferred_method', null)
            ->assertJsonStructure(['profile' => ['legal_name', 'gstin', 'pan', 'upi_id', 'bank_ifsc'], 'methods', 'payTo']);
    }

    public function test_it_saves_and_reads_back_the_billing_identity(): void
    {
        $user = $this->retailer();

        $this->actingAs($user)
            ->putJson('/api/account/payment', $this->profile())
            ->assertOk()
            ->assertJsonPath('profile.gstin', '22AAAAA0000A1Z5')
            ->assertJsonPath('profile.method_label', 'UPI');

        $this->actingFresh($user)
            ->getJson('/api/account/payment')
            ->assertOk()
            ->assertJsonPath('profile.legal_name', 'Serow Retail Private Limited');
    }

    /** Typed in lower case on a phone keyboard, printed upper case on the invoice. */
    public function test_tax_numbers_are_normalised_to_upper_case(): void
    {
        $user = $this->retailer();

        $this->actingAs($user)->putJson('/api/account/payment', $this->profile([
            'gstin' => '22aaaaa0000a1z5',
            'pan' => 'aaaaa0000a',
        ]))->assertOk()->assertJsonPath('profile.gstin', '22AAAAA0000A1Z5');

        $this->assertSame('AAAAA0000A', $user->paymentProfile->pan);
    }

    public function test_a_malformed_gstin_or_pan_is_refused(): void
    {
        $user = $this->retailer();

        $this->actingAs($user)
            ->putJson('/api/account/payment', $this->profile(['gstin' => 'NOTAGSTIN123456']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('gstin');

        $this->actingFresh($user)
            ->putJson('/api/account/payment', $this->profile(['pan' => '12345ABCDE']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('pan');
    }

    public function test_choosing_upi_makes_the_upi_id_required(): void
    {
        $this->actingAs($this->retailer())
            ->putJson('/api/account/payment', $this->profile(['upi_id' => null]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('upi_id');
    }

    public function test_choosing_a_bank_transfer_makes_the_account_required(): void
    {
        $this->actingAs($this->retailer())
            ->putJson('/api/account/payment', [
                'preferred_method' => 'neft',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['bank_account_name', 'bank_account_number', 'bank_ifsc']);
    }

    /** A cheque payer should not have to invent an IFSC to save the form. */
    public function test_a_cheque_payer_is_asked_for_nothing_extra(): void
    {
        $this->actingAs($this->retailer())
            ->putJson('/api/account/payment', ['preferred_method' => 'cheque'])
            ->assertOk()
            ->assertJsonPath('profile.method_label', 'Cheque / DD');
    }

    public function test_a_bad_ifsc_is_refused(): void
    {
        $this->actingAs($this->retailer())
            ->putJson('/api/account/payment', [
                'preferred_method' => 'neft',
                'bank_account_name' => 'Serow Retail',
                'bank_account_number' => '50100123456789',
                'bank_ifsc' => 'HDFCX001234',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('bank_ifsc');
    }

    public function test_an_empty_form_clears_the_profile_rather_than_storing_blanks(): void
    {
        $user = $this->retailer();

        $this->actingAs($user)->putJson('/api/account/payment', $this->profile())->assertOk();
        $this->actingFresh($user)->putJson('/api/account/payment', [])->assertOk();

        $this->assertNull($user->fresh()->paymentProfile->gstin);
    }

    public function test_a_retailer_never_sees_another_retailers_payment_details(): void
    {
        $mine = $this->retailer();
        $theirs = $this->retailer('other@example.com');

        $theirs->paymentProfile()->create($this->profile());

        $this->actingAs($mine)
            ->getJson('/api/account/payment')
            ->assertOk()
            ->assertJsonPath('profile.gstin', null);
    }

    public function test_deleting_a_retailer_takes_the_profile_with_them(): void
    {
        $user = $this->retailer();
        $user->paymentProfile()->create($this->profile());

        $user->delete();

        $this->assertDatabaseCount('payment_profiles', 0);
    }
}
