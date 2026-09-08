<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Line items copy the product name and price as they stood at checkout —
     * the catalog lives in the frontend and its prices move.
     */
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->string('product_id', 80);
            $table->string('product_name', 160);
            $table->string('color_name', 80);
            $table->json('ratio');
            $table->unsignedInteger('sets');
            $table->boolean('private_label')->default(false);
            $table->boolean('sample')->default(false);
            $table->decimal('per_set_price', 12, 2);
            $table->decimal('line_total', 12, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
