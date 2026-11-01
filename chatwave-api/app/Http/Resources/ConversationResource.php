<?php

namespace App\Http\Resources;

use App\Support\MessageReceipts;
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

        // In a private chat: whether either person blocked the other.
        $iBlocked = $otherParticipant !== null && $authUser->hasBlocked($otherParticipant);
        $theyBlocked = $otherParticipant !== null && $authUser->isBlockedBy($otherParticipant);

        return [
            'id' => $this->id,
            'type' => $this->type,
            'name' => $this->type === 'group'
                ? $this->group?->name
                : $otherParticipant?->name,
            'avatar' => $this->type === 'group'
                ? ($this->group?->avatar ? asset('storage/'.$this->group->avatar) : null)
                : $otherParticipant?->avatarUrl(),
            'is_online' => $this->type === 'private'
                ? ! $theyBlocked && (bool) $otherParticipant?->isOnline()
                : null,
            'last_seen_at' => $this->type === 'private' && ! $theyBlocked
                ? $otherParticipant?->visibleLastSeenAt()?->toISOString()
                : null,
            'is_blocked' => $iBlocked,
            'can_message' => ! $iBlocked && ! $theyBlocked,
            'last_message' => $this->latestMessage
                ? (new MessageResource($this->latestMessage))->withReceipts(MessageReceipts::for($this->resource, $authUser))
                : null,
            'unread_count' => (int) ($this->unread_count ?? 0),
            'participant' => $otherParticipant
                ? new PublicUserResource($otherParticipant)
                : null,
            'group' => $this->type === 'group' && $this->group
                ? [
                    'id' => $this->group->id,
                    'name' => $this->group->name,
                    'description' => $this->group->description,
                    'avatar' => $this->group->avatar
                        ? asset('storage/'.$this->group->avatar)
                        : null,
                ]
                : null,
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
        ];
    }
}
