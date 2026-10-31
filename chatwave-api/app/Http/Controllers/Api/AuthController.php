<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        // The model's "hashed" cast hashes the password.
        $user = User::create($request->safe()->only(['name', 'email', 'password']));

        return $this->tokenResponse($request, $user, remember: true, status: 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = $request->authenticate();

        return $this->tokenResponse($request, $user, remember: $request->boolean('remember'));
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        $token = $user->currentAccessToken();

        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }

        // Show as offline straight away instead of after the online window runs out.
        User::withoutTimestamps(fn () => $user->forceFill([
            'is_online' => false,
            'last_seen_at' => now(),
        ])->saveQuietly());

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => new UserResource($request->user()),
        ]);
    }

    /**
     * Issue an expiring API token, named after the browser so it can be recognized in
     * Settings > Signed-in devices. Tokens used to live forever.
     */
    private function tokenResponse(Request $request, User $user, bool $remember, int $status = 200): JsonResponse
    {
        $minutes = config($remember ? 'auth.token_lifetime.remember' : 'auth.token_lifetime.default');
        $device = Str::limit((string) $request->userAgent(), 250, '') ?: 'auth_token';

        $token = $user->createToken($device, ['*'], now()->addMinutes($minutes));

        return response()->json([
            'user' => new UserResource($user),
            'token' => $token->plainTextToken,
            'expires_at' => $token->accessToken->expires_at?->toISOString(),
        ], $status);
    }
}
