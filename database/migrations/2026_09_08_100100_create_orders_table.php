<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * An order is recorded when the retailer confirms the cart, before the
     * WhatsApp handoff — that record is what /tracking and the account order
     * history read, so the code on the WhatsApp message resolves to real data.
     */
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('code', 20)->unique();
            $table->string('status', 30)->default('placed');
            $table->unsignedInteger('total_sets');
            $table->decimal('subtotal', 12, 2);
            $table->decimal('gst', 12, 2);
            $table->decimal('total', 12, 2);
            // Snapshot, not a foreign key: the order must keep the address it
            // shipped to even if the retailer later edits or deletes it.
            $table->json('shipping_address')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('placed_at');
            $table->timestamps();

            $table->index(['user_id', 'placed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
