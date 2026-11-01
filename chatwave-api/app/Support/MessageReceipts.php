<?php

namespace App\Support;

use App\Enums\Permission;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;

/**
 * How far the other person in a private chat has got, as the viewer may see it:
 * the newest message delivered to their app, and the newest they've read.
 *
 * - Only people whose role has "messages.status" see message status at all.
 * - "Seen" needs both people to share read receipts: turning yours off also hides
 *   other people's from you (as in most messaging apps). Turning them off only works
 *   if your role allows it.
 */
final class MessageReceipts
{
    public function __construct(
        public readonly ?int $deliveredUpTo,
        public readonly ?int $readUpTo,
    ) {}

    /**
     * Null when the viewer can't see message status in this conversation (group chats,
     * or their role doesn't include it). Needs the conversation's participants loaded.
     */
    public static function for(Conversation $conversation, User $viewer): ?self
    {
        if ($conversation->type !== 'private' || ! $viewer->hasPermission(Permission::MessageStatus)) {
            return null;
        }

        $other = $conversation->participants->first(fn (User $participant) => $participant->isNot($viewer));

        if (! $other) {
            return null;
        }

        $read = $other->pivot?->last_read_message_id;
        $delivered = max((int) $other->pivot?->last_delivered_message_id, (int) $read);
        $showsRead = $other->sendsReadReceipts() && $viewer->sendsReadReceipts();

        return new self($delivered ?: null, $showsRead && $read ? (int) $read : null);
    }

    /**
     * "sent", "delivered" or "seen" for the viewer's own messages; null for other people's.
     */
    public function statusOf(Message $message, User $viewer): ?string
    {
        if ($message->sender_id !== $viewer->id) {
            return null;
        }

        return match (true) {
            $this->readUpTo !== null && $message->id <= $this->readUpTo => 'seen',
            $this->deliveredUpTo !== null && $message->id <= $this->deliveredUpTo => 'delivered',
            default => 'sent',
        };
    }

    /**
     * @return array{delivered_up_to: int|null, read_up_to: int|null}
     */
    public function toArray(): array
    {
        return ['delivered_up_to' => $this->deliveredUpTo, 'read_up_to' => $this->readUpTo];
    }
}
