<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * "Last seen" only started being recorded with RecordPresence, so people who hadn't used
 * the app since then showed nothing. Fill it in from activity the database already has:
 * when each sign-in token was last used, and when each person last sent a message.
 */
return new class extends Migration
{
    public function up(): void
    {
        $fromTokens = DB::table('personal_access_tokens')
            ->where('tokenable_type', 'App\\Models\\User')
            ->whereNotNull('last_used_at')
            ->selectRaw('tokenable_id, MAX(last_used_at) AS seen')
            ->groupBy('tokenable_id')
            ->pluck('seen', 'tokenable_id');

        $fromMessages = DB::table('messages')
            ->selectRaw('sender_id, MAX(created_at) AS seen')
            ->groupBy('sender_id')
            ->pluck('seen', 'sender_id');

        DB::table('users')->whereNull('last_seen_at')->select('id')->orderBy('id')
            ->chunkById(500, function ($users) use ($fromTokens, $fromMessages) {
                foreach ($users as $user) {
                    // Both are "Y-m-d H:i:s" strings, so the larger one is the later time.
                    $seen = collect([$fromTokens[$user->id] ?? null, $fromMessages[$user->id] ?? null])
                        ->filter()
                        ->max();

                    if ($seen) {
                        DB::table('users')->where('id', $user->id)->update(['last_seen_at' => $seen]);
                    }
                }
            });
    }

    public function down(): void
    {
        // Nothing to undo: the values are real activity times.
    }
};
