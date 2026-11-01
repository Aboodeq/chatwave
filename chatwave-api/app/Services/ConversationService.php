<?php

namespace App\Services;

use App\Models\Conversation;
use App\Models\ConversationParticipant;
use App\Models\Message;
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
     * The user's app has received everything up to now: mark the newest message from other
     * people in each of their conversations as delivered to them (or just in one).
     *
     * Called whenever the app fetches conversations or messages, which it does every few
     * seconds while open. So a message sent while someone is offline stays "sent" until
     * their app next connects, then becomes "delivered". Only new messages are looked at,
     * and nothing is written when there's nothing new.
     */
    public function markDelivered(User $user, ?Conversation $conversation = null): void
    {
        $latest = Message::query()
            ->join('conversation_participants as me', function ($join) use ($user) {
                $join->on('me.conversation_id', '=', 'messages.conversation_id')->where('me.user_id', $user->id);
            })
            ->when($conversation, fn ($query) => $query->where('messages.conversation_id', $conversation->id))
            ->where('messages.sender_id', '!=', $user->id)
            ->whereRaw('messages.id > COALESCE(me.last_delivered_message_id, 0)')
            ->groupBy('messages.conversation_id')
            ->selectRaw('messages.conversation_id, MAX(messages.id) as latest_id')
            ->pluck('latest_id', 'conversation_id');

        foreach ($latest as $conversationId => $latestId) {
            ConversationParticipant::query()
                ->where('conversation_id', $conversationId)
                ->where('user_id', $user->id)
                ->where(fn ($query) => $query->whereNull('last_delivered_message_id')->orWhere('last_delivered_message_id', '<', $latestId))
                ->update(['last_delivered_message_id' => $latestId]);
        }
    }

    /**
     * The user has seen the conversation up to a message (by default, the newest one).
     * Markers only move forward. Whether the sender gets to see "seen" depends on both
     * people's read receipt settings (see MessageReceipts).
     */
    public function markAsRead(Conversation $conversation, User $user, ?int $upTo = null): void
    {
        $newest = (int) $conversation->messages()->max('id');
        $readUpTo = $upTo === null ? $newest : min($upTo, $newest);

        $participant = ConversationParticipant::query()
            ->where('conversation_id', $conversation->id)
            ->where('user_id', $user->id)
            ->first();

        if (! $participant) {
            return;
        }

        $participant->forceFill([
            'last_read_at' => now(),
            'last_read_message_id' => max((int) $participant->last_read_message_id, $readUpTo) ?: null,
            'last_delivered_message_id' => max((int) $participant->last_delivered_message_id, $readUpTo) ?: null,
        ])->save();
    }

    /**
     * Messages from other people that the user hasn't read.
     */
    private function unreadBy(Builder $query, User $user): void
    {
        $query->where('sender_id', '!=', $user->id)
            ->where('messages.id', '>', ConversationParticipant::query()
                ->selectRaw('COALESCE(last_read_message_id, 0)')
                ->whereColumn('conversation_participants.conversation_id', 'messages.conversation_id')
                ->where('conversation_participants.user_id', $user->id)
                ->limit(1));
    }
}
