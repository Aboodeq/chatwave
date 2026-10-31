<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * What other users may see about someone: no email address or phone number, and no
 * presence if they've hidden it.
 */
class PublicUserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'avatar' => $this->avatarUrl(),
            'status_text' => $this->status_text,
            'is_online' => $this->isOnline(),
            'last_seen_at' => $this->visibleLastSeenAt()?->toISOString(),
        ];
    }
}
