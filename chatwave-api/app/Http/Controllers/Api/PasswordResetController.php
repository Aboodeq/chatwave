<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PasswordReset\ResetPasswordRequest;
use App\Http\Requests\PasswordReset\SendResetCodeRequest;
use App\Http\Requests\PasswordReset\VerifyResetCodeRequest;
use App\Jobs\SendPasswordResetCode;
use App\Services\PasswordResetService;
use App\Services\VerificationCodeService;
use Illuminate\Http\JsonResponse;

/**
 * Every endpoint takes "email" or "phone": accounts created with a phone number get their
 * code by text message.
 */
class PasswordResetController extends Controller
{
    public function __construct(protected PasswordResetService $passwordResets) {}

    /**
     * Always answers the same way, so the endpoint can't be used to find out who has an account.
     */
    public function send(SendResetCodeRequest $request): JsonResponse
    {
        SendPasswordResetCode::dispatch($request->contact());

        $where = $request->contactField() === 'phone' ? 'this phone number' : 'this email';

        return response()->json([
            'message' => "If an account exists for {$where}, a verification code has been sent.",
            'expires_in' => VerificationCodeService::TTL_MINUTES * 60,
        ]);
    }

    public function verify(VerifyResetCodeRequest $request): JsonResponse
    {
        $this->passwordResets->verify($request->contact(), $request->validated('otp'));

        return response()->json([
            'message' => 'Verification code accepted.',
        ]);
    }

    public function reset(ResetPasswordRequest $request): JsonResponse
    {
        $this->passwordResets->reset(
            $request->contact(),
            $request->validated('otp'),
            $request->validated('password'),
        );

        return response()->json([
            'message' => 'Password reset successfully.',
        ]);
    }
}
