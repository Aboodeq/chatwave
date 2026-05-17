<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'name'        => $this->name,
            'email'       => $this->email,
            'phone'       => $this->phone,
            'avatar'      => $this->avatar
                ? asset('storage/' . $this->avatar)
                : null,
            'status_text' => $this->status_text,
            'is_online'   => $this->is_online,
            'last_seen_at' => $this->last_seen_at?->toISOString(),
            'created_at'  => $this->created_at->toISOString(),
        ];
    }
}
