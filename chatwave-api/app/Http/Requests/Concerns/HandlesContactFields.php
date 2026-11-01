<?php

namespace App\Http\Requests\Concerns;

use App\Support\Phone;
use Illuminate\Support\Str;

/**
 * For forms that take an email address or a phone number (not both): normalizes them the
 * way they are stored (lowercased email, E.164 phone) and provides the shared rules.
 */
trait HandlesContactFields
{
    protected function prepareForValidation(): void
    {
        $changes = [];

        if (is_string($email = $this->input('email'))) {
            $changes['email'] = Str::lower(trim($email));
        }

        if (is_string($phone = $this->input('phone'))) {
            $changes['phone'] = Phone::normalize($phone);
        }

        if ($changes !== []) {
            $this->merge($changes);
        }
    }

    /**
     * @param  array<int, mixed>  $email  extra rules for the email address
     * @param  array<int, mixed>  $phone  extra rules for the phone number
     * @return array<string, array<int, mixed>>
     */
    protected function contactRules(array $email = [], array $phone = []): array
    {
        return [
            'email' => ['required_without:phone', 'prohibits:phone', 'nullable', 'string', 'email', 'max:191', ...$email],
            'phone' => ['required_without:email', 'nullable', 'string', 'regex:'.Phone::PATTERN, ...$phone],
        ];
    }

    /**
     * @return array<string, string>
     */
    protected function contactMessages(): array
    {
        return [
            'email.required_without' => __('Enter your email address or phone number.'),
            'phone.required_without' => __('Enter your phone number or email address.'),
            'email.prohibits' => __('Use an email address or a phone number, not both.'),
            'email.email' => __('Please enter a valid email address.'),
            'phone.regex' => __('Enter a valid phone number, including the country code.'),
        ];
    }

    /**
     * The email address or phone number this request is about, normalized.
     */
    public function contact(): string
    {
        return (string) ($this->validated('email') ?? $this->validated('phone'));
    }

    /**
     * The field the contact came in, for error messages: "email" or "phone".
     */
    public function contactField(): string
    {
        return $this->filled('email') ? 'email' : 'phone';
    }
}
