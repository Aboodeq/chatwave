<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One table for every one-time code: password resets by email or text message, and
 * confirming a phone number at sign-up. Replaces password_reset_otps, whose codes only
 * lived for ten minutes, so nothing worth keeping is lost.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('verification_codes', function (Blueprint $table) {
            $table->id();
            $table->string('purpose', 32);
            $table->string('identifier', 191); // a lowercased email or an E.164 phone number
            $table->string('code_hash');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('expires_at')->index();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->unique(['purpose', 'identifier']);
        });

        Schema::dropIfExists('password_reset_otps');
    }

    public function down(): void
    {
        Schema::create('password_reset_otps', function (Blueprint $table) {
            $table->id();
            $table->string('email', 191)->unique();
            $table->string('code_hash');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('expires_at')->index();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
        });

        Schema::dropIfExists('verification_codes');
    }
};
