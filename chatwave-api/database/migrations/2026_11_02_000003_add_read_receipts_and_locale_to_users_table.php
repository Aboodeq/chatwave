<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Two preferences: whether others see when you've read their messages, and the language
 * for emails and text messages ChatWave sends you.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('read_receipts')->default(true)->after('show_online_status');
            $table->string('locale', 10)->default('en')->after('read_receipts');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['read_receipts', 'locale']);
        });
    }
};
