<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ConversationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $authUser = $request->user();

        // For private chats, get the other participant
        $otherParticipant = null;
        if ($this->type === 'private') {
            $otherParticipant = $this->participants
                ->where('id', '!=', $authUser->id)
                ->first();
        }

        return [
            'id'             => $this->id,
            'type'           => $this->type,
            'name'           => $this->type === 'group'
                ? $this->group?->name
                : $otherParticipant?->name,
            'avatar'         => $this->type === 'group'
                ? ($this->group?->avatar ? asset('storage/' . $this->group->avatar) : null)
                : ($otherParticipant?->avatar ? asset('storage/' . $otherParticipant->avatar) : null),
            'is_online'      => $this->type === 'private'
                ? $otherParticipant?->is_online
                : null,
            'last_seen_at'   => $this->type === 'private'
                ? $otherParticipant?->last_seen_at?->toISOString()
                : null,
            'last_message'   => $this->latestMessage
                ? new MessageResource($this->latestMessage)
                : null,
            'unread_count'   => (int) ($this->unread_count ?? 0),
            'participant'    => $otherParticipant
                ? new PublicUserResource($otherParticipant)
                : null,
            'group'          => $this->type === 'group' && $this->group
                ? [
                    'id'          => $this->group->id,
                    'name'        => $this->group->name,
                    'description' => $this->group->description,
                    'avatar'      => $this->group->avatar
                        ? asset('storage/' . $this->group->avatar)
                        : null,
                ]
                : null,
            'created_at'     => $this->created_at->toISOString(),
            'updated_at'     => $this->updated_at->toISOString(),
        ];
    }
}
