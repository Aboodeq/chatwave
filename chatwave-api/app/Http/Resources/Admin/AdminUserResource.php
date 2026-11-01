<?php

namespace App\Http\Resources\Admin;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A person as admins see them: contact details, role, status and real activity.
 *
 * @mixin User
 */
class AdminUserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $online = $this->is_online
            && $this->last_seen_at !== null
            && $this->last_seen_at->gte(now()->subSeconds(User::ONLINE_WINDOW_SECONDS));

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'avatar' => $this->avatarUrl(),
            'status_text' => $this->status_text,
            'role' => $this->role->value,
            'sign_up_method' => $this->email === null ? 'phone' : 'email',
            'verified' => $this->email === null ? $this->phone_verified_at !== null : $this->email_verified_at !== null,
            'is_online' => $online,
            'last_seen_at' => $this->last_seen_at?->toISOString(),
            'suspended_at' => $this->suspended_at?->toISOString(),
            'suspension_reason' => $this->suspension_reason,
            'created_at' => $this->created_at?->toISOString(),
            'messages_count' => $this->whenCounted('messages'),
            'conversations_count' => $this->whenCounted('conversations'),
        ];
    }
}
