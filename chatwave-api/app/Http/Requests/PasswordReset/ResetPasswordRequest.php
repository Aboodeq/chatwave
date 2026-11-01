<?php

namespace App\Http\Requests\PasswordReset;

use App\Http\Requests\Concerns\HandlesContactFields;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class ResetPasswordRequest extends FormRequest
{
    use HandlesContactFields;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            ...$this->contactRules(),
            'otp' => ['required', 'digits:6'],
            'password' => ['required', 'string', 'confirmed', Password::defaults()],
        ];
    }

    public function messages(): array
    {
        return [
            ...$this->contactMessages(),
            'password.confirmed' => __('Passwords do not match.'),
        ];
    }
}
