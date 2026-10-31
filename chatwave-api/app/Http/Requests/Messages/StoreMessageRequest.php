<?php

namespace App\Http\Requests\Messages;

use App\Models\Conversation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Participation is enforced on the route (can:view,conversation).
    }

    public function rules(): array
    {
        /** @var Conversation $conversation */
        $conversation = $this->route('conversation');

        return [
            // Only text messages exist until media uploads are implemented.
            'body'        => ['required', 'string', 'max:5000'],
            'reply_to_id' => [
                'nullable',
                'integer',
                // Must be a live message in this same conversation; otherwise the reply
                // preview would expose messages from conversations the sender isn't in.
                Rule::exists('messages', 'id')
                    ->where('conversation_id', $conversation->id)
                    ->whereNull('deleted_at'),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'body.required'      => 'Message cannot be empty.',
            'reply_to_id.exists' => 'You can only reply to a message in this conversation.',
        ];
    }
}
