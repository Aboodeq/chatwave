<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\Concerns\HandlesContactFields;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * Sign up with an email address, or with a phone number and the code texted to it
 * (see SendRegistrationCodeRequest).
 */
class RegisterRequest extends FormRequest
{
    use HandlesContactFields;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:100'],
            ...$this->contactRules(
                email: [Rule::unique(User::class, 'email')],
                phone: [Rule::unique(User::class, 'phone')],
            ),
            'otp' => ['required_with:phone', 'nullable', 'digits:6'],
            'password' => ['required', 'string', 'confirmed', Password::defaults()],
        ];
    }

    public function messages(): array
    {
        return [
            ...$this->contactMessages(),
            'name.required' => 'Name is required.',
            'name.min' => 'Name must be at least 2 characters.',
            'email.unique' => 'This email is already registered.',
            'phone.unique' => 'This phone number is already registered.',
            'otp.required_with' => 'Enter the 6-digit code we texted you.',
            'otp.digits' => 'The code has 6 digits.',
            'password.required' => 'Password is required.',
            'password.min' => 'Password must be at least 8 characters.',
            'password.confirmed' => 'Passwords do not match.',
        ];
    }
}
