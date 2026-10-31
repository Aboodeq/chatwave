<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
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
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $attributes = [
        'is_online' => false,
        'show_online_status' => true,
        'status_text' => 'Hey there! I am using ChatWave.',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'last_seen_at' => 'datetime',
        'is_online' => 'boolean',
        'show_online_status' => 'boolean',
        'password' => 'hashed',
    ];

    /**
     * Emails are stored lowercased so lookups and the unique index are case-insensitive
     * on every database.
     */
    protected function email(): Attribute
    {
        return Attribute::make(
            set: fn (string $value) => Str::lower(trim($value)),
        );
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
        return $this->show_online_status
            && $this->is_online
            && $this->last_seen_at !== null
            && $this->last_seen_at->gte(now()->subSeconds(self::ONLINE_WINDOW_SECONDS));
    }

    /**
     * Last activity as other people may see it (hidden if the user turned it off).
     */
    public function visibleLastSeenAt(): ?CarbonInterface
    {
        return $this->show_online_status ? $this->last_seen_at : null;
    }

    public function contacts()
    {
        return $this->hasMany(Contact::class);
    }

    public function conversations()
    {
        return $this->belongsToMany(Conversation::class, 'conversation_participants')
            ->withPivot('role', 'joined_at', 'last_read_at', 'muted_until')
            ->withTimestamps();
    }

    public function messages()
    {
        return $this->hasMany(Message::class, 'sender_id');
    }
}
