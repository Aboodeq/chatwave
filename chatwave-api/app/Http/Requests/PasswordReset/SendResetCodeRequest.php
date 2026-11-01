<?php

namespace App\Http\Requests\PasswordReset;

use App\Http\Requests\Concerns\HandlesContactFields;
use Illuminate\Foundation\Http\FormRequest;

class SendResetCodeRequest extends FormRequest
{
    use HandlesContactFields;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return $this->contactRules();
    }

    public function messages(): array
    {
        return $this->contactMessages();
    }
}
