<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Conversation extends Model
{
    use HasFactory;

    protected $fillable = [
        'type',
        'created_by',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function participants()
    {
        return $this->belongsToMany(User::class, 'conversation_participants')
            ->withPivot('role', 'joined_at', 'last_read_at', 'last_delivered_message_id', 'last_read_message_id', 'muted_until')
            ->withTimestamps();
    }

    public function messages()
    {
        return $this->hasMany(Message::class);
    }

    public function latestMessage()
    {
        return $this->hasOne(Message::class)->latestOfMany();
    }

    public function group()
    {
        return $this->hasOne(Group::class);
    }

    public function isPrivate(): bool
    {
        return $this->type === 'private';
    }

    public function hasParticipant(User $user): bool
    {
        if ($this->relationLoaded('participants')) {
            return $this->participants->contains('id', $user->getKey());
        }

        return $this->participants()->whereKey($user->getKey())->exists();
    }
}
