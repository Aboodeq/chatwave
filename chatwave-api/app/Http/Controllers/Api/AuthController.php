<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Enums\VerificationPurpose;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\SendRegistrationCodeRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\Sms\SmsException;
use App\Services\Sms\SmsSender;
use App\Services\VerificationCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    public function __construct(private readonly VerificationCodeService $codes) {}

    /**
     * Text a sign-up code to a phone number. In local development with the "log" SMS
     * driver nothing is really sent, so the code is also returned as "dev_code".
     */
    public function sendRegistrationCode(SendRegistrationCodeRequest $request, SmsSender $sms): JsonResponse
    {
        $phone = $request->validated('phone');
        $code = $this->codes->issue(VerificationPurpose::Registration, $phone);
        $minutes = VerificationCodeService::TTL_MINUTES;

        try {
            $sms->send($phone, "{$code} is your ChatWave verification code. It expires in {$minutes} minutes.");
        } catch (SmsException $e) {
            report($e);
            $this->codes->consume(VerificationPurpose::Registration, $phone);

            return response()->json([
                'message' => "We couldn't send a text message right now. Please try again in a few minutes.",
            ], 503);
        }

        $response = [
            'message' => 'We texted a 6-digit code to your phone.',
            'expires_in' => $minutes * 60,
        ];

        if (! $sms->deliversMessages() && app()->environment('local')) {
            $response['dev_code'] = $code;
        }

        return response()->json($response);
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        $data = $request->safe()->only(['name', 'email', 'phone', 'password']);
        $phone = $data['phone'] ?? null;

        if ($phone !== null) {
            $this->codes->verify(VerificationPurpose::Registration, $phone, (string) $request->validated('otp'));
        }

        $user = DB::transaction(function () use ($data, $phone) {
            // Use the code up first, so it can't create two accounts.
            if ($phone !== null && ! $this->codes->consume(VerificationPurpose::Registration, $phone)) {
                throw $this->codes->invalidCode();
            }

            // The model's "hashed" cast hashes the password.
            $user = new User($data);
            $user->forceFill([
                'phone_verified_at' => $phone !== null ? now() : null,
                // The very first account administers the system.
                'role' => User::query()->exists() ? UserRole::User : UserRole::Admin,
            ])->save();

            return $user;
        });

        return $this->tokenResponse($request, $user, remember: true, status: 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = $request->authenticate();

        if ($user->isSuspended()) {
            return response()->json([
                'message' => 'This account has been suspended. Contact your administrator if you think this is a mistake.',
                'code' => 'account_suspended',
            ], 403);
        }

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
