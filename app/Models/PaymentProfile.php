<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * A retailer's billing identity and the account their advance comes from.
 * No card data lives here — see the migration for why.
 */
class PaymentProfile extends Model
{
    /** Ways a retailer can send the advance, and what to call each one. */
    public const METHODS = [
        'upi' => 'UPI',
        'neft' => 'NEFT',
        'rtgs' => 'RTGS',
        'imps' => 'IMPS',
        'cheque' => 'Cheque / DD',
    ];

    /** Methods that settle into a bank account, so the account is needed. */
    public const BANK_METHODS = ['neft', 'rtgs', 'imps'];

    protected $fillable = [
        'legal_name', 'gstin', 'pan', 'preferred_method',
        'upi_id', 'bank_account_name', 'bank_account_number', 'bank_ifsc', 'bank_name',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function methodLabel(): ?string
    {
        return self::METHODS[$this->preferred_method] ?? null;
    }

    /**
     * The profile as the account screen and the admin desk see it — the
     * retailer's own data, so nothing is withheld, but hand-listed all the same
     * so a column added later is not exposed by accident.
     *
     * @return array<string, mixed>
     */
    public function payload(): array
    {
        return [
            'legal_name' => $this->legal_name,
            'gstin' => $this->gstin,
            'pan' => $this->pan,
            'preferred_method' => $this->preferred_method,
            'method_label' => $this->methodLabel(),
            'upi_id' => $this->upi_id,
            'bank_account_name' => $this->bank_account_name,
            'bank_account_number' => $this->bank_account_number,
            'bank_ifsc' => $this->bank_ifsc,
            'bank_name' => $this->bank_name,
        ];
    }

    /**
     * What gets frozen onto an order. Only the billing identity: an invoice
     * needs the tax numbers on it, and has no business carrying the retailer's
     * bank account around with it.
     *
     * @return array<string, string>
     */
    public function invoiceSnapshot(): array
    {
        return array_filter([
            'legal_name' => $this->legal_name,
            'gstin' => $this->gstin,
            'pan' => $this->pan,
        ], fn (?string $value) => filled($value));
    }

    /** GSTIN and PAN are printed uppercase and compared as such. */
    public function setGstinAttribute(?string $value): void
    {
        $this->attributes['gstin'] = $value === null ? null : Str::upper(trim($value));
    }

    public function setPanAttribute(?string $value): void
    {
        $this->attributes['pan'] = $value === null ? null : Str::upper(trim($value));
    }

    public function setBankIfscAttribute(?string $value): void
    {
        $this->attributes['bank_ifsc'] = $value === null ? null : Str::upper(trim($value));
    }
}
