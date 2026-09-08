<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The billing identity as it stood when the order was placed, snapshotted
     * for the same reason `shipping_address` is: an invoice is a record of what
     * was true that day. A retailer correcting their GSTIN next month must not
     * silently rewrite every invoice they have already filed.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->json('billing_profile')->nullable()->after('shipping_address');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('billing_profile');
        });
    }
};
