<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PasswordReset\ResetPasswordRequest;
use App\Http\Requests\PasswordReset\SendResetCodeRequest;
use App\Http\Requests\PasswordReset\VerifyResetCodeRequest;
use App\Jobs\SendPasswordResetCode;
use App\Services\PasswordResetOtpService;
use Illuminate\Http\JsonResponse;

class PasswordResetController extends Controller
{
    public function __construct(protected PasswordResetOtpService $otps) {}

    /**
     * Always answers the same way, so the endpoint can't be used to find out who has an account.
     */
    public function send(SendResetCodeRequest $request): JsonResponse
    {
        SendPasswordResetCode::dispatch($request->validated('email'));

        return response()->json([
            'message' => 'If an account exists for this email, a verification code has been sent.',
            'expires_in' => PasswordResetOtpService::TTL_MINUTES * 60,
        ]);
    }

    public function verify(VerifyResetCodeRequest $request): JsonResponse
    {
        $this->otps->verify($request->validated('email'), $request->validated('otp'));

        return response()->json([
            'message' => 'Verification code accepted.',
        ]);
    }

    public function reset(ResetPasswordRequest $request): JsonResponse
    {
        $this->otps->reset(
            $request->validated('email'),
            $request->validated('otp'),
            $request->validated('password'),
        );

        return response()->json([
            'message' => 'Password reset successfully.',
        ]);
    }
}
