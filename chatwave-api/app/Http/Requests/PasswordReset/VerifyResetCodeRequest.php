<?php

namespace App\Http\Requests\PasswordReset;

use App\Http\Requests\Concerns\HandlesContactFields;
use Illuminate\Foundation\Http\FormRequest;

class VerifyResetCodeRequest extends FormRequest
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
        ];
    }

    public function messages(): array
    {
        return $this->contactMessages();
    }
}
