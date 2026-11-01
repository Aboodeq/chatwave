<?php

namespace App\Http\Resources\Admin;

use App\Models\AdminAction;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AdminAction
 */
class AdminActionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'action' => $this->action,
            'details' => (object) ($this->details ?? []),
            'created_at' => $this->created_at?->toISOString(),
            'admin' => $this->person($this->admin),
            'target' => $this->person($this->target),
        ];
    }

    /**
     * @return array{id: int, name: string, avatar: ?string}|null
     */
    private function person(?User $user): ?array
    {
        return $user ? ['id' => $user->id, 'name' => $user->name, 'avatar' => $user->avatarUrl()] : null;
    }
}
