<?php

namespace App\Services;

use App\Enums\VerificationPurpose;
use App\Mail\PasswordResetOtpMail;
use App\Models\User;
use App\Services\Sms\SmsSender;
use App\Support\Phone;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Resetting a forgotten password with a code sent to the account's email address or, for
 * accounts created with a phone number, by text message.
 *
 * An identifier is a normalized email address or an E.164 phone number.
 */
class PasswordResetService
{
    public function __construct(
        private readonly VerificationCodeService $codes,
        private readonly SmsSender $sms,
    ) {}

    /**
     * Issue a new code and send it, if an account uses this email or phone number. Runs on
     * the queue (see SendPasswordResetCode) so response times don't reveal who has an account.
     */
    public function send(string $identifier): void
    {
        $user = $this->findUser($identifier);

        if (! $user) {
            return;
        }

        $code = $this->codes->issue(VerificationPurpose::PasswordReset, $identifier);
        $minutes = VerificationCodeService::TTL_MINUTES;

        if (Phone::isValid($identifier)) {
            $this->sms->send(
                $identifier,
                "{$code} is your ChatWave password reset code. It expires in {$minutes} minutes. If you didn't ask for it, ignore this message.",
            );

            return;
        }

        Mail::to($user)->send(new PasswordResetOtpMail($code, $minutes));
    }

    /**
     * @throws ValidationException
     */
    public function verify(string $identifier, string $code): void
    {
        $this->codes->verify(VerificationPurpose::PasswordReset, $identifier, $code);
    }

    /**
     * Set a new password with a valid code, then sign the user out of every device.
     *
     * @throws ValidationException
     */
    public function reset(string $identifier, string $code, string $password): User
    {
        $this->verify($identifier, $code);

        $user = DB::transaction(function () use ($identifier, $password) {
            // Consume the code before using it, so two parallel resets can't both succeed.
            if (! $this->codes->consume(VerificationPurpose::PasswordReset, $identifier)) {
                throw $this->codes->invalidCode();
            }

            $user = $this->findUser($identifier) ?? throw $this->codes->invalidCode();

            // Receiving the code proves the email address or phone number works.
            $verified = Phone::isValid($identifier) ? 'phone_verified_at' : 'email_verified_at';

            $user->forceFill([
                'password' => $password, // hashed by the model cast
                'remember_token' => Str::random(60),
                $verified => $user->{$verified} ?? now(),
            ])->save();

            $user->tokens()->delete();

            return $user;
        });

        event(new PasswordReset($user));

        return $user;
    }

    private function findUser(string $identifier): ?User
    {
        $column = Phone::isValid($identifier) ? 'phone' : 'email';

        return User::where($column, $identifier)->first();
    }
}
