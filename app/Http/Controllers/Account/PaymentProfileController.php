<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Models\PaymentProfile;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * The retailer's billing identity and how they pay. Orders here are 100% in
 * advance by transfer, so this replaces the back-and-forth of asking for a
 * GSTIN on WhatsApp every time an invoice has to be raised.
 *
 * The response also carries the company's own payment instructions, because a
 * screen that collects payment details and never says where to send the money
 * is only half of the conversation.
 */
class PaymentProfileController extends Controller
{
    /** Format rules, kept here so the messages read like a person wrote them. */
    private const PATTERNS = [
        // 22AAAAA0000A1Z5 — state code, PAN, entity digit, Z, checksum.
        'gstin' => '/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/',
        'pan' => '/^[A-Z]{5}[0-9]{4}[A-Z]$/',
        'ifsc' => '/^[A-Z]{4}0[A-Z0-9]{6}$/',
        'upi' => '/^[a-zA-Z0-9._-]{2,64}@[a-zA-Z]{2,32}$/',
        'account' => '/^[0-9]{9,18}$/',
    ];

    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'profile' => $request->user()->paymentProfile?->payload() ?? $this->blank(),
            'methods' => PaymentProfile::METHODS,
            'bank_methods' => PaymentProfile::BANK_METHODS,
            'payTo' => Setting::payTo(),
        ]);
    }

    /** Every field the form owns, so a cleared one can be told from an absent one. */
    private const FIELDS = [
        'legal_name', 'gstin', 'pan', 'preferred_method',
        'upi_id', 'bank_account_name', 'bank_account_number', 'bank_ifsc', 'bank_name',
    ];

    /** Stored and printed upper case, so the format rules are written that way. */
    private const UPPERCASED = ['gstin', 'pan', 'bank_ifsc'];

    public function update(Request $request): JsonResponse
    {
        // Uppercased before validation rather than in the model: a phone
        // keyboard will happily send a lower-case GSTIN, and rejecting that as
        // malformed blames the retailer for our own strictness.
        foreach (self::UPPERCASED as $field) {
            if (filled($request->input($field))) {
                $request->merge([$field => Str::upper(trim((string) $request->input($field)))]);
            }
        }

        $method = $request->input('preferred_method');
        $needsBank = in_array($method, PaymentProfile::BANK_METHODS, true);

        $data = $request->validate([
            'legal_name' => ['nullable', 'string', 'max:160'],
            'gstin' => ['nullable', 'string', 'size:15', 'regex:'.self::PATTERNS['gstin']],
            'pan' => ['nullable', 'string', 'size:10', 'regex:'.self::PATTERNS['pan']],
            'preferred_method' => ['nullable', Rule::in(array_keys(PaymentProfile::METHODS))],

            // Required only when the chosen method actually needs it: asking a
            // cheque payer for an IFSC is how a form gets abandoned.
            'upi_id' => [
                Rule::requiredIf($method === 'upi'),
                'nullable', 'string', 'max:120', 'regex:'.self::PATTERNS['upi'],
            ],
            'bank_account_name' => [Rule::requiredIf($needsBank), 'nullable', 'string', 'max:160'],
            'bank_account_number' => [
                Rule::requiredIf($needsBank),
                'nullable', 'string', 'regex:'.self::PATTERNS['account'],
            ],
            'bank_ifsc' => [
                Rule::requiredIf($needsBank),
                'nullable', 'string', 'size:11', 'regex:'.self::PATTERNS['ifsc'],
            ],
            'bank_name' => ['nullable', 'string', 'max:160'],
        ], [
            'gstin.regex' => 'That does not look like a GSTIN. It is 15 characters, like 22AAAAA0000A1Z5.',
            'gstin.size' => 'A GSTIN is exactly 15 characters.',
            'pan.regex' => 'That does not look like a PAN. It is 10 characters, like AAAAA0000A.',
            'pan.size' => 'A PAN is exactly 10 characters.',
            'bank_ifsc.regex' => 'That does not look like an IFSC code, like HDFC0001234.',
            'bank_ifsc.size' => 'An IFSC code is exactly 11 characters.',
            'upi_id.regex' => 'A UPI ID looks like yourname@bank.',
            'upi_id.required' => 'Add the UPI ID you will pay from.',
            'bank_account_number.regex' => 'An account number is 9 to 18 digits.',
            'bank_account_number.required' => 'Add the account the transfer will come from.',
            'bank_ifsc.required' => 'Add the IFSC code of that account.',
            'bank_account_name.required' => 'Add the name the account is held in.',
        ]);

        // A full replace, not a patch. The screen posts the whole form, so a
        // field the retailer cleared arrives absent — filling only what was
        // sent would leave a deleted GSTIN sitting in the database forever.
        // Blanks land as null so "not given" is one state, not two.
        $values = [];

        foreach (self::FIELDS as $field) {
            $values[$field] = filled($data[$field] ?? null) ? $data[$field] : null;
        }

        $profile = $request->user()->paymentProfile()->firstOrNew([]);
        $profile->fill($values);
        $profile->save();

        return response()->json(['profile' => $profile->fresh()->payload()]);
    }

    /** An empty profile, so the form has every key before anything is saved. */
    private function blank(): array
    {
        return (new PaymentProfile)->payload();
    }
}
