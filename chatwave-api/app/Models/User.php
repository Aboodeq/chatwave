<?php

namespace App\Models;

use App\Enums\Permission;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Someone counts as online if they've used the app this recently. The client polls
     * every few seconds while open, and activity is recorded once a minute (RecordPresence).
     */
    public const ONLINE_WINDOW_SECONDS = 120;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'avatar',
        'status_text',
        'last_seen_at',
        'is_online',
        'show_online_status',
        'read_receipts',
        'locale',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $attributes = [
        'is_online' => false,
        'show_online_status' => true,
        'read_receipts' => true,
        'locale' => 'en',
        'status_text' => 'Hey there! I am using ChatWave.',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'phone_verified_at' => 'datetime',
        'suspended_at' => 'datetime',
        'last_seen_at' => 'datetime',
        'is_online' => 'boolean',
        'show_online_status' => 'boolean',
        'read_receipts' => 'boolean',
        'password' => 'hashed',
    ];

    /**
     * Emails are stored lowercased so lookups and the unique index are case-insensitive
     * on every database. Accounts created with a phone number have no email.
     */
    protected function email(): Attribute
    {
        return Attribute::make(
            set: fn (?string $value) => $value === null ? null : Str::lower(trim($value)),
        );
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    /**
     * The user's role, from the per-request cache (Member if none is set).
     */
    public function currentRole(): Role
    {
        return Role::cachedFind($this->role_id) ?? Role::member();
    }

    public function hasPermission(Permission $permission): bool
    {
        return $this->currentRole()->allows($permission);
    }

    /**
     * @return list<string>
     */
    public function permissionValues(): array
    {
        return $this->currentRole()->grantedPermissions();
    }

    public function isAdmin(): bool
    {
        return $this->currentRole()->isAdmin();
    }

    /**
     * Any administrative permission opens the admin dashboard (each page checks its own).
     */
    public function canAccessAdmin(): bool
    {
        foreach (Permission::cases() as $permission) {
            if ($permission->isAdministrative() && $this->hasPermission($permission)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Whether others may see when this user has read their messages. Turning read receipts
     * off only counts if the user's role allows it.
     */
    public function sendsReadReceipts(): bool
    {
        return $this->read_receipts || ! $this->hasPermission(Permission::HideReadReceipts);
    }

    /**
     * Whether others may see this user's online status and last seen (same rule).
     */
    public function sharesOnlineStatus(): bool
    {
        return $this->show_online_status || ! $this->hasPermission(Permission::HideOnlineStatus);
    }

    public function isSuspended(): bool
    {
        return $this->suspended_at !== null;
    }

    /**
     * How the person signs in, for display: their email, or their phone number.
     */
    public function signInIdentifier(): string
    {
        return $this->email ?? (string) $this->phone;
    }

    public function avatarUrl(): ?string
    {
        return $this->avatar
            ? route('avatars.show', ['file' => basename($this->avatar)])
            : null;
    }

    /**
     * Online as other people may see it: recently active, and not hidden by the user.
     */
    public function isOnline(): bool
    {
        return $this->sharesOnlineStatus()
            && $this->is_online
            && $this->last_seen_at !== null
            && $this->last_seen_at->gte(now()->subSeconds(self::ONLINE_WINDOW_SECONDS));
    }

    /**
     * Last activity as other people may see it (hidden if the user turned it off).
     */
    public function visibleLastSeenAt(): ?CarbonInterface
    {
        return $this->sharesOnlineStatus() ? $this->last_seen_at : null;
    }

    /**
     * Whether this user has blocked the other one.
     */
    public function hasBlocked(User|int $user): bool
    {
        return isset($this->blockState()['blocked'][self::idOf($user)]);
    }

    /**
     * Whether the other user has blocked this one.
     */
    public function isBlockedBy(User|int $user): bool
    {
        return isset($this->blockState()['blockedBy'][self::idOf($user)]);
    }

    /**
     * Call after blocking or unblocking so later checks in the same request see it.
     */
    public function forgetBlocks(): void
    {
        request()->attributes->remove($this->blockCacheKey());
    }

    /**
     * Who this user has blocked and who has blocked them. Loaded with one query and kept
     * on the current request, so every check while rendering a response is free and the
     * next request starts fresh.
     *
     * @return array{blocked: array<int, true>, blockedBy: array<int, true>}
     */
    private function blockState(): array
    {
        $cache = request()->attributes;

        if ($cache->has($this->blockCacheKey())) {
            return $cache->get($this->blockCacheKey());
        }

        $rows = Contact::query()
            ->where('is_blocked', true)
            ->where(fn ($query) => $query->where('user_id', $this->id)->orWhere('contact_id', $this->id))
            ->get(['user_id', 'contact_id']);

        $state = [
            'blocked' => $rows->where('user_id', $this->id)->mapWithKeys(fn ($row) => [(int) $row->contact_id => true])->all(),
            'blockedBy' => $rows->where('contact_id', $this->id)->mapWithKeys(fn ($row) => [(int) $row->user_id => true])->all(),
        ];
        $cache->set($this->blockCacheKey(), $state);

        return $state;
    }

    private function blockCacheKey(): string
    {
        return 'chatwave.blocks.'.$this->getKey();
    }

    private static function idOf(User|int $user): int
    {
        return $user instanceof User ? (int) $user->getKey() : $user;
    }

    public function contacts()
    {
        return $this->hasMany(Contact::class);
    }

    public function conversations()
    {
        return $this->belongsToMany(Conversation::class, 'conversation_participants')
            ->withPivot('role', 'joined_at', 'last_read_at', 'last_delivered_message_id', 'last_read_message_id', 'muted_until')
            ->withTimestamps();
    }

    public function messages()
    {
        return $this->hasMany(Message::class, 'sender_id');
    }
}
