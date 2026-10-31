<?php

namespace App\Services;

use App\Mail\PasswordResetOtpMail;
use App\Models\PasswordResetOtp;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * One-time codes for resetting a password by email.
 *
 * Each code is valid for TTL_MINUTES and allows MAX_ATTEMPTS wrong guesses. How often codes
 * can be requested and checked per address is limited in AppServiceProvider.
 */
class PasswordResetOtpService
{
    public const TTL_MINUTES = 10;

    public const MAX_ATTEMPTS = 5;

    /**
     * Issue a new code and email it, if an account uses this address. Runs on the queue
     * (see SendPasswordResetCode) so response times don't reveal which emails exist.
     */
    public function send(string $email): void
    {
        $user = User::where('email', $email)->first();

        if (! $user) {
            return;
        }

        $code = str_pad((string) random_int(0, 999_999), 6, '0', STR_PAD_LEFT);

        PasswordResetOtp::updateOrCreate(
            ['email' => $email],
            [
                'code_hash' => Hash::make($code),
                'attempts' => 0,
                'expires_at' => now()->addMinutes(self::TTL_MINUTES),
                'verified_at' => null,
            ],
        );

        Mail::to($user)->send(new PasswordResetOtpMail($code, self::TTL_MINUTES));
    }

    /**
     * Check a code. Every check uses up one attempt unless the code is right.
     *
     * @throws ValidationException
     */
    public function verify(string $email, string $code): PasswordResetOtp
    {
        $otp = PasswordResetOtp::where('email', $email)->first();

        if (! $otp || $otp->isExpired()) {
            $otp?->delete();

            throw $this->invalidCode();
        }

        // Reserve the attempt atomically. Reading the counter and checking it separately
        // let parallel requests make more guesses than allowed.
        $reserved = PasswordResetOtp::whereKey($otp->getKey())
            ->where('attempts', '<', self::MAX_ATTEMPTS)
            ->increment('attempts');

        if ($reserved === 0) {
            throw ValidationException::withMessages([
                'otp' => 'Too many attempts. Please request a new code.',
            ]);
        }

        if (! Hash::check($code, $otp->code_hash)) {
            throw $this->invalidCode();
        }

        // The right code shouldn't count against the user (it is checked again on reset).
        PasswordResetOtp::whereKey($otp->getKey())->update([
            'attempts' => DB::raw('attempts - 1'),
            'verified_at' => now(),
        ]);

        return $otp;
    }

    /**
     * Set a new password with a valid code, then sign the user out of every device.
     *
     * @throws ValidationException
     */
    public function reset(string $email, string $code, string $password): User
    {
        $this->verify($email, $code);

        $user = DB::transaction(function () use ($email, $password) {
            // Consume the code before using it, so two parallel resets can't both succeed.
            if (PasswordResetOtp::where('email', $email)->delete() === 0) {
                throw $this->invalidCode();
            }

            $user = User::where('email', $email)->first();

            if (! $user) {
                throw $this->invalidCode();
            }

            $user->forceFill([
                'password' => $password, // hashed by the model cast
                'remember_token' => Str::random(60),
                'email_verified_at' => $user->email_verified_at ?? now(),
            ])->save();

            $user->tokens()->delete();

            return $user;
        });

        event(new PasswordReset($user));

        return $user;
    }

    private function invalidCode(): ValidationException
    {
        return ValidationException::withMessages([
            'otp' => 'The verification code is invalid or expired.',
        ]);
    }
}
