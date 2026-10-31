<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Keeps "online" and "last seen" current for signed-in users.
 *
 * The client polls every few seconds, so this writes at most once a minute per user to
 * keep database writes (and SQLite lock contention) low. It runs before the controller,
 * so signing out can still mark the user offline.
 */
class RecordPresence
{
    public const INTERVAL_SECONDS = 60;

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user instanceof User && $this->isStale($user)) {
            User::withoutTimestamps(fn () => $user->forceFill([
                'is_online' => true,
                'last_seen_at' => now(),
            ])->saveQuietly());
        }

        return $next($request);
    }

    private function isStale(User $user): bool
    {
        return ! $user->is_online
            || $user->last_seen_at === null
            || $user->last_seen_at->lt(now()->subSeconds(self::INTERVAL_SECONDS));
    }
}
