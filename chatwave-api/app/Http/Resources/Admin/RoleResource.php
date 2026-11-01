<?php

namespace App\Http\Resources\Admin;

use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Role
 */
class RoleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            // "admin" and "member" for the built-in roles (the app shows their names translated).
            'key' => $this->key,
            'name' => $this->name,
            'description' => $this->description,
            'permissions' => $this->grantedPermissions(),
            'locked' => $this->isAdmin(),
            'deletable' => ! $this->isBuiltIn(),
            'users_count' => $this->whenCounted('users'),
        ];
    }
}
