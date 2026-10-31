<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MessageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'conversation_id' => $this->conversation_id,
            'sender'          => new PublicUserResource($this->whenLoaded('sender')),
            'type'            => $this->type,
            'body'            => $this->body,
            'reply_to'        => $this->whenLoaded('replyTo', function () {
                return [
                    'id'     => $this->replyTo->id,
                    'body'   => $this->replyTo->body,
                    'sender' => new PublicUserResource($this->replyTo->sender),
                ];
            }),
            'media'           => MediaResource::collection($this->whenLoaded('media')),
            'reactions'       => $this->whenLoaded('reactions', function () {
                return $this->reactions->groupBy('emoji')->map(function ($items, $emoji) {
                    return [
                        'emoji' => $emoji,
                        'count' => $items->count(),
                        'users' => PublicUserResource::collection($items->pluck('user')),
                    ];
                })->values();
            }),
            'is_edited'       => $this->is_edited,
            'edited_at'       => $this->edited_at?->toISOString(),
            'created_at'      => $this->created_at->toISOString(),
            'deleted_at'      => $this->deleted_at?->toISOString(),
        ];
    }
}
