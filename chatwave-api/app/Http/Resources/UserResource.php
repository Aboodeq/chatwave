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
            'role' => [
                'id' => $this->currentRole()->id,
                'key' => $this->currentRole()->key,
                'name' => $this->currentRole()->name,
            ],
            // Everything the user's role allows, for showing or hiding parts of the app.
            'permissions' => $this->permissionValues(),
            'show_online_status' => $this->show_online_status,
            'read_receipts' => $this->read_receipts,
            'locale' => $this->locale,
            'created_at' => $this->created_at->toISOString(),
        ];
    }
}
