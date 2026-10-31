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
        // People you've blocked don't get to see when you're online.
        $viewer = $request->user();
        $hidden = $viewer !== null && $viewer->isNot($this->resource) && $viewer->isBlockedBy($this->resource);

        return [
            'id' => $this->id,
            'name' => $this->name,
            'avatar' => $this->avatarUrl(),
            'status_text' => $this->status_text,
            'is_online' => ! $hidden && $this->isOnline(),
            'last_seen_at' => $hidden ? null : $this->visibleLastSeenAt()?->toISOString(),
        ];
    }
}
