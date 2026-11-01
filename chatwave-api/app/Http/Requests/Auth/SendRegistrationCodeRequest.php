<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\Concerns\HandlesContactFields;
use App\Models\User;
use App\Support\Phone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * First step of signing up with a phone number: text a code to it.
 */
class SendRegistrationCodeRequest extends FormRequest
{
    use HandlesContactFields;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'phone' => ['required', 'string', 'regex:'.Phone::PATTERN, Rule::unique(User::class, 'phone')],
        ];
    }

    public function messages(): array
    {
        return [
            'phone.required' => __('Enter your phone number.'),
            'phone.regex' => __('Enter a valid phone number, including the country code.'),
            'phone.unique' => __('This phone number is already registered. Sign in instead.'),
        ];
    }
}
