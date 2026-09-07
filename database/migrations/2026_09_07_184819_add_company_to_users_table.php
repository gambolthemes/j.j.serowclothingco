<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Retailers register as businesses, so an account carries the store name
     * alongside the buyer's own name.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('company', 120)->nullable()->after('name');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('company');
        });
    }
};
