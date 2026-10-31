<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

/**
 * The signed-in user's own account, including private contact details.
 * Use PublicUserResource when showing a user to anyone else.
 */
class UserResource extends PublicUserResource
{
    public function toArray(Request $request): array
    {
        return [
            ...parent::toArray($request),
            'email' => $this->email,
            'phone' => $this->phone,
            'created_at' => $this->created_at->toISOString(),
        ];
    }
}
