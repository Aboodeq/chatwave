<?php

namespace App\Http\Requests\Profile;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'min:2', 'max:100'],
            'status_text' => ['sometimes', 'nullable', 'string', 'max:160'],
            'show_online_status' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Name is required.',
            'name.min' => 'Name must be at least 2 characters.',
            'status_text.max' => 'Keep it under 160 characters.',
        ];
    }

    /**
     * The validated changes, with a cleared "about" stored as empty text.
     *
     * @return array<string, mixed>
     */
    public function changes(): array
    {
        $changes = $this->validated();

        if (array_key_exists('status_text', $changes)) {
            $changes['status_text'] = $changes['status_text'] ?? '';
        }

        return $changes;
    }
}
