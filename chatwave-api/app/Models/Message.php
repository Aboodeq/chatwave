<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Message extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * Relations MessageResource needs; load these wherever messages are returned.
     */
    public const RESOURCE_RELATIONS = ['sender', 'media', 'reactions.user', 'replyTo.sender'];

    protected $fillable = [
        'conversation_id',
        'sender_id',
        'type',
        'body',
        'reply_to_id',
        'is_edited',
        'edited_at',
    ];

    protected $casts = [
        'is_edited' => 'boolean',
        'edited_at' => 'datetime',
    ];

    public function conversation()
    {
        return $this->belongsTo(Conversation::class);
    }

    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function replyTo()
    {
        return $this->belongsTo(Message::class, 'reply_to_id');
    }

    public function replies()
    {
        return $this->hasMany(Message::class, 'reply_to_id');
    }

    public function media()
    {
        return $this->hasMany(MessageMedia::class);
    }

    public function reactions()
    {
        return $this->hasMany(MessageReaction::class);
    }
}
