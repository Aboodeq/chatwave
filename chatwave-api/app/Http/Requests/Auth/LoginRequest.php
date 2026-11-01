<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\Concerns\HandlesContactFields;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    use HandlesContactFields;

    /** Failed attempts allowed per account and IP before a one-minute lockout. */
    public const MAX_ATTEMPTS = 5;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            ...$this->contactRules(),
            'password' => ['required', 'string', 'max:255'],
            'remember' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            ...$this->contactMessages(),
            'password.required' => __('Password is required.'),
        ];
    }

    /**
     * Check the credentials and return the user. Accounts sign in with their email address
     * or their phone number.
     *
     * Uses Auth::validate() rather than Auth::attempt(): it compares in constant time but
     * never starts a session, which a token API doesn't need (and which crashed when the
     * sessions table was missing).
     *
     * @throws ValidationException
     */
    public function authenticate(): User
    {
        $this->ensureIsNotRateLimited();

        $field = $this->contactField();
        $credentials = [$field => $this->contact(), 'password' => $this->input('password')];

        // The "web" guard checks credentials (in constant time) without needing a session.
        $guard = Auth::guard('web');

        if (! $guard->validate($credentials)) {
            RateLimiter::hit($this->throttleKey(), 60);

            throw ValidationException::withMessages([
                $field => $field === 'phone'
                    ? __("That phone number and password don't match. Check them and try again.")
                    : __("That email and password don't match. Check them and try again."),
            ]);
        }

        RateLimiter::clear($this->throttleKey());

        /** @var User $user */
        $user = $guard->getLastAttempted();

        if (config('hashing.rehash_on_login', true)) {
            $guard->getProvider()->rehashPasswordIfRequired($user, $credentials);
        }

        return $user;
    }

    /**
     * @throws ValidationException
     */
    protected function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), self::MAX_ATTEMPTS)) {
            return;
        }

        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw ValidationException::withMessages([
            $this->contactField() => __('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ])->status(429);
    }

    protected function throttleKey(): string
    {
        return 'login:'.sha1($this->contact()).'|'.$this->ip();
    }
}
