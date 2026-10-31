<?php

namespace App\Services;

use App\Models\Conversation;
use App\Models\ConversationParticipant;
use App\Models\MessageReceipt;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ConversationService
{
    /**
     * Relations ConversationResource needs.
     */
    public const RESOURCE_RELATIONS = ['participants', 'group', 'latestMessage.sender'];

    /**
     * The user's conversations, most recently active first, with unread counts.
     */
    public function getConversationsForUser(User $user): Collection
    {
        return Conversation::query()
            ->whereIn('id', ConversationParticipant::select('conversation_id')->where('user_id', $user->id))
            ->with(self::RESOURCE_RELATIONS)
            ->withCount(['messages as unread_count' => fn (Builder $query) => $this->unreadBy($query, $user)])
            // Sending a message touches the conversation, so updated_at tracks activity.
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->get();
    }

    /**
     * Load what ConversationResource needs for a single conversation.
     */
    public function loadForUser(Conversation $conversation, User $user): Conversation
    {
        return $conversation
            ->load(self::RESOURCE_RELATIONS)
            ->loadCount(['messages as unread_count' => fn (Builder $query) => $this->unreadBy($query, $user)]);
    }

    /**
     * Return the private conversation between two users, creating it if needed.
     */
    public function findOrCreatePrivateConversation(User $authUser, User $otherUser): Conversation
    {
        $pair = collect([$authUser->id, $otherUser->id])->sort()->implode(':');

        // Serialize concurrent requests for the same pair (a double click used to create
        // two conversations between the same people).
        return Cache::lock("conversations:private:{$pair}", 10)->block(5, function () use ($authUser, $otherUser) {
            $existing = Conversation::where('type', 'private')
                ->whereHas('participants', fn ($q) => $q->where('user_id', $authUser->id))
                ->whereHas('participants', fn ($q) => $q->where('user_id', $otherUser->id))
                ->oldest('id')
                ->first();

            if ($existing) {
                return $existing;
            }

            return DB::transaction(function () use ($authUser, $otherUser) {
                $conversation = Conversation::create([
                    'type' => 'private',
                    'created_by' => $authUser->id,
                ]);

                $now = now();

                $conversation->participants()->attach([
                    $authUser->id => ['role' => 'member', 'joined_at' => $now],
                    $otherUser->id => ['role' => 'member', 'joined_at' => $now],
                ]);

                return $conversation;
            });
        });
    }

    /**
     * Mark every message from other people in the conversation as read by the user.
     */
    public function markAsRead(Conversation $conversation, User $user): void
    {
        $now = now();

        // Bulk upserts in chunks; this used to run two queries per unread message.
        $conversation->messages()
            ->select('messages.id')
            ->tap(fn (Builder $query) => $this->unreadBy($query, $user))
            ->chunkById(500, function ($messages) use ($user, $now) {
                MessageReceipt::upsert(
                    $messages->map(fn ($message) => [
                        'message_id' => $message->id,
                        'user_id' => $user->id,
                        'delivered_at' => $now,
                        'read_at' => $now,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ])->all(),
                    ['message_id', 'user_id'],
                    ['read_at', 'updated_at'],
                );
            }, 'messages.id', 'id');

        $conversation->participants()->updateExistingPivot($user->id, ['last_read_at' => $now]);
    }

    /**
     * Messages from other people that the user hasn't read.
     */
    private function unreadBy(Builder $query, User $user): void
    {
        $query->where('sender_id', '!=', $user->id)
            ->whereDoesntHave('receipts', fn (Builder $q) => $q->where('user_id', $user->id)->whereNotNull('read_at'));
    }
}
