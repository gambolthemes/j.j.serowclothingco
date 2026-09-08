<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One row per attempt to pay an order online, whichever gateway it went to.
 *
 * Attempts are kept, not just successes: a retailer who says "I paid and it
 * failed" leaves a trail here, and the desk can see what the gateway said
 * without logging into two dashboards.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();

            $table->string('gateway', 20);
            // The gateway's own order/intent id, which is what its callback and
            // its webhook both quote. Unique per gateway so a replayed webhook
            // lands on the row that already exists instead of creating another.
            $table->string('gateway_order_id', 120);
            // Set on capture. Null while the attempt is still open.
            $table->string('gateway_payment_id', 120)->nullable();

            $table->string('status', 20)->default('created');

            // What the buyer was actually charged, in the currency they saw.
            $table->decimal('amount', 12, 2);
            $table->string('currency', 3);
            // What it settles as against the order, always INR. For a rupee
            // charge these are the same number; for USD it is the order total
            // and `fx_rate` records what it was converted at, because the rate
            // is an admin setting that will not be the same next month.
            $table->decimal('amount_inr', 12, 2);
            $table->decimal('fx_rate', 12, 4)->nullable();

            // Whatever the gateway sent back, for the desk to read when a
            // payment is disputed. Never trusted for anything.
            $table->json('raw')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->unique(['gateway', 'gateway_order_id']);
            $table->index(['order_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
