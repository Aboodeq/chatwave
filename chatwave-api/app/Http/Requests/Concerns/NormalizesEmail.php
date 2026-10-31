<?php

namespace App\Http\Requests\Concerns;

use Illuminate\Support\Str;

/**
 * Lowercases and trims the "email" input before validation, matching how emails are stored.
 */
trait NormalizesEmail
{
    protected function prepareForValidation(): void
    {
        $email = $this->input('email');

        if (is_string($email)) {
            $this->merge(['email' => Str::lower(trim($email))]);
        }
    }
}
