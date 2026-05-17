<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Mail\PasswordResetOtpMail;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => new UserResource($user),
            'token' => $token,
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        if (! Auth::attempt($request->only('email', 'password'))) {
            return response()->json([
                'message' => 'Invalid credentials.',
            ], 401);
        }

        $user = User::where('email', $request->email)->firstOrFail();
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => new UserResource($user),
            'token' => $token,
        ]);
    }

    public function sendPasswordResetOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $email = $this->normalizeEmail($validated['email']);
        $user = $this->findUserByEmail($email);

        if ($user) {
            $code = (string) random_int(100000, 999999);

            DB::table('password_reset_otps')->updateOrInsert(
                ['email' => $email],
                [
                    'code_hash' => Hash::make($code),
                    'attempts' => 0,
                    'expires_at' => now()->addMinutes(10),
                    'verified_at' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            Mail::to($user->email)->send(new PasswordResetOtpMail($code));
        }

        return response()->json([
            'message' => 'If an account exists for this email, a verification code has been sent.',
            'expires_in' => 600,
        ]);
    }

    public function verifyPasswordResetOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'otp' => ['required', 'digits:6'],
        ]);

        $email = $this->normalizeEmail($validated['email']);
        $record = $this->validPasswordResetOtp($email, $validated['otp']);

        DB::table('password_reset_otps')
            ->where('id', $record->id)
            ->update([
                'verified_at' => now(),
                'updated_at' => now(),
            ]);

        return response()->json([
            'message' => 'Verification code accepted.',
        ]);
    }

    public function resetPasswordWithOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'otp' => ['required', 'digits:6'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $email = $this->normalizeEmail($validated['email']);
        $this->validPasswordResetOtp($email, $validated['otp']);

        $user = $this->findUserByEmail($email);

        if (! $user) {
            throw ValidationException::withMessages([
                'email' => ['We could not find an account for this email.'],
            ]);
        }

        $user->forceFill([
            'password' => Hash::make($validated['password']),
            'email_verified_at' => $user->email_verified_at ?? now(),
        ])->save();

        $user->tokens()->delete();

        DB::table('password_reset_otps')
            ->where('email', $email)
            ->delete();

        return response()->json([
            'message' => 'Password reset successfully.',
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

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

    private function normalizeEmail(string $email): string
    {
        return Str::lower(trim($email));
    }

    private function findUserByEmail(string $email): ?User
    {
        return User::query()
            ->whereRaw('LOWER(email) = ?', [$email])
            ->first();
    }

    private function validPasswordResetOtp(string $email, string $code): object
    {
        $record = DB::table('password_reset_otps')
            ->where('email', $email)
            ->first();

        if (! $record) {
            throw ValidationException::withMessages([
                'otp' => ['The verification code is invalid or expired.'],
            ]);
        }

        if (Carbon::parse($record->expires_at)->isPast()) {
            DB::table('password_reset_otps')
                ->where('id', $record->id)
                ->delete();

            throw ValidationException::withMessages([
                'otp' => ['The verification code is invalid or expired.'],
            ]);
        }

        if ($record->attempts >= 5) {
            throw ValidationException::withMessages([
                'otp' => ['Too many attempts. Please request a new code.'],
            ]);
        }

        if (! Hash::check($code, $record->code_hash)) {
            DB::table('password_reset_otps')
                ->where('id', $record->id)
                ->increment('attempts', 1, ['updated_at' => now()]);

            throw ValidationException::withMessages([
                'otp' => ['The verification code is invalid or expired.'],
            ]);
        }

        return $record;
    }
}
