<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One entry in the admin audit log. Entries are only ever added.
 */
class AdminAction extends Model
{
    public const UPDATED_AT = null;

    public const SUSPENDED = 'user.suspended';

    public const RESTORED = 'user.restored';

    public const ROLE_CHANGED = 'user.role_changed';

    public const SIGNED_OUT = 'user.signed_out';

    public const ROLE_CREATED = 'role.created';

    public const ROLE_UPDATED = 'role.updated';

    public const ROLE_DELETED = 'role.deleted';

    protected $fillable = [
        'admin_id',
        'target_user_id',
        'action',
        'details',
    ];

    protected $casts = [
        'details' => 'array',
        'created_at' => 'datetime',
    ];

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    public function target(): BelongsTo
    {
        return $this->belongsTo(User::class, 'target_user_id');
    }

    /**
     * @param  array<string, mixed>  $details
     */
    public static function record(User $admin, string $action, ?User $target = null, array $details = []): self
    {
        return static::create([
            'admin_id' => $admin->id,
            'target_user_id' => $target?->id,
            'action' => $action,
            'details' => $details ?: null,
        ]);
    }
}
