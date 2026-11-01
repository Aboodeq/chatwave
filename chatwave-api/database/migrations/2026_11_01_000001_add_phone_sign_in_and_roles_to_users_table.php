<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * People can now sign up with a phone number instead of an email address, and accounts
 * get a role (user or admin) and can be suspended by an admin.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Phone-only accounts have no email. The unique index stays: it allows many NULLs.
            $table->string('email', 191)->nullable()->change();
            $table->timestamp('phone_verified_at')->nullable()->after('phone');
            $table->string('role', 20)->default('user')->after('password')->index();
            $table->timestamp('suspended_at')->nullable()->index();
            $table->string('suspension_reason', 255)->nullable();
            $table->index('created_at'); // sign-ups per day on the admin dashboard
        });

        Schema::table('messages', function (Blueprint $table) {
            $table->index('created_at'); // messages per day on the admin dashboard
        });

        // Like most self-hosted chat apps, the first account administers the system.
        // New installs get the same rule at sign-up (see AuthController).
        $firstUserId = DB::table('users')->orderBy('id')->value('id');

        if ($firstUserId !== null) {
            DB::table('users')->where('id', $firstUserId)->update(['role' => 'admin']);
        }
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropIndex(['created_at']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['created_at']);
            $table->dropIndex(['role']);
            $table->dropIndex(['suspended_at']);
            $table->dropColumn(['phone_verified_at', 'role', 'suspended_at', 'suspension_reason']);
        });

        // Phone-only accounts can't be kept once email is required again.
        DB::table('users')->whereNull('email')->delete();

        Schema::table('users', function (Blueprint $table) {
            $table->string('email', 191)->nullable(false)->change();
        });
    }
};
