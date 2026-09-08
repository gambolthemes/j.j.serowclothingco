<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One draft cart per retailer, so a cart built on a laptop is still there on
 * the phone. Until now it only ever lived in that browser's localStorage.
 *
 * The lines are stored as JSON rather than rows: a cart is a scratchpad, it is
 * rewritten wholesale on every change, and nothing ever queries inside it —
 * pricing and validation happen against the catalog when the order is placed.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('carts', function (Blueprint $table) {
            $table->id();
            // Unique: a retailer has one cart, and the sync overwrites it.
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->json('items');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('carts');
    }
};
