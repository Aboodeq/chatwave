<?php

namespace App\Http\Requests\Profile;

use App\Enums\Permission;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

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
            'read_receipts' => ['sometimes', 'boolean'],
            'locale' => ['sometimes', 'string', Rule::in(['en', 'ar'])],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => __('Name is required.'),
            'name.min' => __('Name must be at least 2 characters.'),
            'status_text.max' => __('Keep it under 160 characters.'),
        ];
    }

    /**
     * Hiding your online status or read receipts is only possible if your role allows it.
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                $user = $this->user();

                if ($this->has('show_online_status') && ! $this->boolean('show_online_status') && ! $user->hasPermission(Permission::HideOnlineStatus)) {
                    $validator->errors()->add('show_online_status', __("Your role doesn't allow hiding your online status."));
                }

                if ($this->has('read_receipts') && ! $this->boolean('read_receipts') && ! $user->hasPermission(Permission::HideReadReceipts)) {
                    $validator->errors()->add('read_receipts', __("Your role doesn't allow turning off read receipts."));
                }
            },
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
