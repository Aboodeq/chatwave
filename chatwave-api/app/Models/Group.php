<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Group extends Model
{
    use HasFactory;

    protected $fillable = [
        'conversation_id',
        'name',
        'description',
        'avatar',
        'invite_link',
    ];

    public function conversation()
    {
        return $this->belongsTo(Conversation::class);
    }

    public function participants()
    {
        return $this->conversation->participants();
    }
}
