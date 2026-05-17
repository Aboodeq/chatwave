<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MediaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'file_name'     => $this->file_name,
            'file_size'     => $this->file_size,
            'mime_type'     => $this->mime_type,
            'url'           => asset('storage/' . $this->file_path),
            'thumbnail_url' => $this->thumbnail_path
                ? asset('storage/' . $this->thumbnail_path)
                : null,
        ];
    }
}
