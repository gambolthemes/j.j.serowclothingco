<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * How a retailer bills and pays: the tax identities that belong on their
 * invoice, and the account the wholesale desk should expect the advance to
 * arrive from (and send a refund back to).
 *
 * Deliberately no card data. Orders are paid 100% in advance by transfer and
 * confirmed on WhatsApp — there is no gateway here, and storing a card number
 * ourselves would be a PCI-DSS obligation with nothing to gain. If online
 * payment is ever added, the saved instrument belongs in the gateway as a
 * token, not in this table.
 *
 * Its own table rather than columns on `users` because it is a different
 * concern with a different audience: the retailer maintains it, the accounts
 * desk reads it, and nothing about signing in needs it loaded.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();

            // Billing identity. The registered name often differs from the shop
            // name the retailer signed up with, and the invoice needs the former.
            $table->string('legal_name', 160)->nullable();
            $table->string('gstin', 15)->nullable();
            $table->string('pan', 10)->nullable();

            // How they intend to pay, so the desk knows what to watch for.
            $table->string('preferred_method', 20)->nullable();
            $table->string('upi_id', 120)->nullable();
            $table->string('bank_account_name', 160)->nullable();
            $table->string('bank_account_number', 20)->nullable();
            $table->string('bank_ifsc', 11)->nullable();
            $table->string('bank_name', 160)->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_profiles');
    }
};
