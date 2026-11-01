<?php

namespace App\Services;

use App\Enums\VerificationPurpose;
use App\Models\VerificationCode;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Six-digit one-time codes, sent by email or text message.
 *
 * Only a hash is stored. Each code is valid for TTL_MINUTES and allows MAX_ATTEMPTS wrong
 * guesses; how often codes can be requested and checked is limited in AppServiceProvider.
 */
class VerificationCodeService
{
    public const TTL_MINUTES = 10;

    public const MAX_ATTEMPTS = 5;

    /**
     * Create a new code (replacing any earlier one) and return it, to be sent.
     */
    public function issue(VerificationPurpose $purpose, string $identifier): string
    {
        $code = str_pad((string) random_int(0, 999_999), 6, '0', STR_PAD_LEFT);

        VerificationCode::updateOrCreate(
            ['purpose' => $purpose, 'identifier' => $identifier],
            [
                'code_hash' => Hash::make($code),
                'attempts' => 0,
                'expires_at' => now()->addMinutes(self::TTL_MINUTES),
                'verified_at' => null,
            ],
        );

        return $code;
    }

    /**
     * Check a code. Every check uses up one attempt unless the code is right.
     *
     * @throws ValidationException
     */
    public function verify(VerificationPurpose $purpose, string $identifier, string $code): VerificationCode
    {
        $record = $this->find($purpose, $identifier);

        if (! $record || $record->isExpired()) {
            $record?->delete();

            throw $this->invalidCode();
        }

        // Reserve the attempt atomically. Reading the counter and checking it separately
        // let parallel requests make more guesses than allowed.
        $reserved = VerificationCode::whereKey($record->getKey())
            ->where('attempts', '<', self::MAX_ATTEMPTS)
            ->increment('attempts');

        if ($reserved === 0) {
            throw ValidationException::withMessages([
                'otp' => 'Too many attempts. Please request a new code.',
            ]);
        }

        if (! Hash::check($code, $record->code_hash)) {
            throw $this->invalidCode();
        }

        // The right code shouldn't count against the user (it may be checked again).
        VerificationCode::whereKey($record->getKey())->update([
            'attempts' => DB::raw('attempts - 1'),
            'verified_at' => now(),
        ]);

        return $record;
    }

    /**
     * Use up a code. Returns false if it was already used, so that of two parallel
     * requests with the same code only one can succeed.
     */
    public function consume(VerificationPurpose $purpose, string $identifier): bool
    {
        return VerificationCode::query()
            ->where('purpose', $purpose)
            ->where('identifier', $identifier)
            ->delete() > 0;
    }

    public function invalidCode(): ValidationException
    {
        return ValidationException::withMessages([
            'otp' => 'The verification code is invalid or expired.',
        ]);
    }

    private function find(VerificationPurpose $purpose, string $identifier): ?VerificationCode
    {
        return VerificationCode::query()
            ->where('purpose', $purpose)
            ->where('identifier', $identifier)
            ->first();
    }
}
