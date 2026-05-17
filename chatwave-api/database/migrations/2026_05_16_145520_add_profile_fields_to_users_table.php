<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 20)->nullable()->unique()->after('email');
            $table->string('avatar')->nullable()->after('password');
            $table->string('status_text', 160)->default('Hey there! I am using ChatWave.')->after('avatar');
            $table->timestamp('last_seen_at')->nullable()->after('status_text');
            $table->boolean('is_online')->default(false)->after('last_seen_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['phone', 'avatar', 'status_text', 'last_seen_at', 'is_online']);
        });
    }
};
