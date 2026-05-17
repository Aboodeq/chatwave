<?php

namespace App\Services;

use App\Models\Conversation;
use App\Models\ConversationParticipant;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ConversationService
{
    public function getConversationsForUser(User $user)
    {
        return Conversation::whereHas('participants', function ($query) use ($user) {
            $query->where('user_id', $user->id);
        })
            ->with([
                'participants',
                'group',
                'latestMessage.sender',
            ])
            ->withCount(['messages as unread_count' => function ($query) use ($user) {
                $query->whereDoesntHave('receipts', function ($q) use ($user) {
                    $q->where('user_id', $user->id)->whereNotNull('read_at');
                })->where('sender_id', '!=', $user->id);
            }])
            ->orderByDesc(function ($query) {
                $query->select('created_at')
                    ->from('messages')
                    ->whereColumn('conversation_id', 'conversations.id')
                    ->latest()
                    ->limit(1);
            })
            ->get();
    }

    public function findOrCreatePrivateConversation(User $authUser, User $otherUser): Conversation
    {
        // Check if a private conversation already exists between the two users
        $existing = Conversation::where('type', 'private')
            ->whereHas('participants', function ($q) use ($authUser) {
                $q->where('user_id', $authUser->id);
            })
            ->whereHas('participants', function ($q) use ($otherUser) {
                $q->where('user_id', $otherUser->id);
            })
            ->first();

        if ($existing) {
            return $existing;
        }

        return DB::transaction(function () use ($authUser, $otherUser) {
            $conversation = Conversation::create([
                'type'       => 'private',
                'created_by' => $authUser->id,
            ]);

            ConversationParticipant::insert([
                [
                    'conversation_id' => $conversation->id,
                    'user_id'         => $authUser->id,
                    'role'            => 'member',
                    'joined_at'       => now(),
                    'created_at'      => now(),
                    'updated_at'      => now(),
                ],
                [
                    'conversation_id' => $conversation->id,
                    'user_id'         => $otherUser->id,
                    'role'            => 'member',
                    'joined_at'       => now(),
                    'created_at'      => now(),
                    'updated_at'      => now(),
                ],
            ]);

            return $conversation;
        });
    }

    public function userBelongsToConversation(User $user, Conversation $conversation): bool
    {
        return $conversation->participants()
            ->where('user_id', $user->id)
            ->exists();
    }
}
