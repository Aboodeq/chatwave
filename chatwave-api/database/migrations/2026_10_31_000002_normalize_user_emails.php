<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Emails used to be stored exactly as typed, so on SQLite/PostgreSQL "Ann@x.com" and
 * "ann@x.com" could be two accounts and logins were case-sensitive. New emails are now
 * lowercased by the User model; this lowercases existing ones.
 *
 * If two accounts differ only by letter case, neither is changed and a warning is logged
 * so they can be merged by hand.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')->select(['id', 'email'])->orderBy('id')->chunkById(500, function ($users) {
            foreach ($users as $user) {
                $normalized = Str::lower(trim($user->email));

                if ($normalized === $user->email) {
                    continue;
                }

                $conflict = DB::table('users')
                    ->where('email', $normalized)
                    ->where('id', '!=', $user->id)
                    ->exists();

                if ($conflict) {
                    Log::warning('Email not normalized: another account already uses the lowercase form.', [
                        'user_id' => $user->id,
                    ]);

                    continue;
                }

                DB::table('users')->where('id', $user->id)->update(['email' => $normalized]);
            }
        });
    }

    public function down(): void
    {
        // Original casing is not kept, so this cannot be reversed (and doesn't need to be).
    }
};
