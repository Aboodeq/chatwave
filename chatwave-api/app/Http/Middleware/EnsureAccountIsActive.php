<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * Suspended accounts can't use the API. Suspending someone also deletes their tokens, so
 * this is a safety net for requests already in flight.
 */
class EnsureAccountIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user instanceof User && $user->isSuspended()) {
            $token = $user->currentAccessToken();

            if ($token instanceof PersonalAccessToken) {
                $token->delete();
            }

            return response()->json([
                'message' => __('This account has been suspended.'),
                'code' => 'account_suspended',
            ], 403);
        }

        return $next($request);
    }
}
