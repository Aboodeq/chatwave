<?php

namespace App\Http\Requests\Conversations;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreConversationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'user_id' => [
                'required',
                'integer',
                Rule::notIn([$this->user()->id]),
                Rule::exists('users', 'id'),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'user_id.not_in' => 'You cannot start a conversation with yourself.',
        ];
    }
}
