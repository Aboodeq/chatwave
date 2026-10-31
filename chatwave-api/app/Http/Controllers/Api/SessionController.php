<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * The devices (sign-in tokens) the user is signed in on.
 */
class SessionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $currentId = $this->currentTokenId($request);

        $sessions = $request->user()->tokens()
            ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->orderByDesc('last_used_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (PersonalAccessToken $token) => [
                'id' => $token->id,
                // Tokens are named after the browser's user agent at sign-in.
                'user_agent' => $token->name === 'auth_token' ? null : $token->name,
                'created_at' => $token->created_at?->toISOString(),
                'last_used_at' => $token->last_used_at?->toISOString(),
                'expires_at' => $token->expires_at?->toISOString(),
                'current' => $token->id === $currentId,
            ])
            ->sortByDesc('current')
            ->values();

        return response()->json(['sessions' => $sessions]);
    }

    /**
     * Sign out one device.
     */
    public function destroy(Request $request, int $session): JsonResponse
    {
        $deleted = $request->user()->tokens()->whereKey($session)->delete();

        abort_if($deleted === 0, 404);

        return response()->json(['message' => 'Signed out of that device.']);
    }

    /**
     * Sign out every device except this one.
     */
    public function destroyOthers(Request $request): JsonResponse
    {
        $currentId = $this->currentTokenId($request);

        $count = $request->user()->tokens()
            ->when($currentId !== null, fn ($query) => $query->whereKeyNot($currentId))
            ->delete();

        return response()->json([
            'message' => 'Signed out of all other devices.',
            'signed_out' => $count,
        ]);
    }

    private function currentTokenId(Request $request): ?int
    {
        $token = $request->user()->currentAccessToken();

        return $token instanceof PersonalAccessToken ? (int) $token->getKey() : null;
    }
}
