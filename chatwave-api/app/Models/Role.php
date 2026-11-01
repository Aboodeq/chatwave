<?php

namespace App\Models;

use App\Enums\Permission;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A named set of permissions. Every user has exactly one role.
 *
 * The built-in Admin role always allows everything and can't be changed; Member is what new
 * accounts get. Other roles are created by admins.
 */
class Role extends Model
{
    public const ADMIN = 'admin';

    public const MEMBER = 'member';

    private const CACHE_KEY = 'chatwave.roles';

    protected $fillable = [
        'name',
        'description',
        'permissions',
    ];

    protected $casts = [
        'permissions' => 'array',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function isAdmin(): bool
    {
        return $this->key === self::ADMIN;
    }

    public function isMember(): bool
    {
        return $this->key === self::MEMBER;
    }

    public function isBuiltIn(): bool
    {
        return $this->key !== null;
    }

    public function allows(Permission $permission): bool
    {
        return $this->isAdmin() || in_array($permission->value, $this->permissions ?? [], true);
    }

    /**
     * The permissions this role grants, in catalogue order.
     *
     * @return list<string>
     */
    public function grantedPermissions(): array
    {
        return array_values(array_filter(
            Permission::values(),
            fn (string $permission) => $this->allows(Permission::from($permission)),
        ));
    }

    public static function admin(): self
    {
        return self::cachedAll()->firstWhere('key', self::ADMIN);
    }

    public static function member(): self
    {
        return self::cachedAll()->firstWhere('key', self::MEMBER);
    }

    public static function cachedFind(?int $id): ?self
    {
        return $id === null ? null : self::cachedAll()->get($id);
    }

    /**
     * Every role, loaded once per request (there are only a few) and keyed by id, so
     * permission checks while rendering a response don't query the database.
     *
     * @return Collection<int, self>
     */
    public static function cachedAll(): Collection
    {
        $cache = request()->attributes;

        if (! $cache->has(self::CACHE_KEY)) {
            $cache->set(self::CACHE_KEY, self::query()->orderBy('id')->get()->keyBy('id'));
        }

        return $cache->get(self::CACHE_KEY);
    }

    /**
     * Call after creating, changing or deleting a role.
     */
    public static function forgetCache(): void
    {
        request()->attributes->remove(self::CACHE_KEY);
    }
}
