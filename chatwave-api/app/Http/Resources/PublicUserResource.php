<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * What other users may see about someone: no email address or phone number.
 */
class PublicUserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'avatar' => $this->avatar
                ? asset('storage/'.$this->avatar)
                : null,
            'status_text' => $this->status_text,
            'is_online' => $this->is_online,
            'last_seen_at' => $this->last_seen_at?->toISOString(),
        ];
    }
}
