<?php

namespace App\Policies;

use App\Models\ConversationParticipant;
use App\Models\Message;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class MessagePolicy
{
    public function update(User $user, Message $message): Response
    {
        return $this->isActiveAuthor($user, $message) && $message->type === 'text'
            ? Response::allow()
            : Response::deny('You can only edit your own messages.');
    }

    public function delete(User $user, Message $message): Response
    {
        return $this->isActiveAuthor($user, $message) && $message->type !== 'system'
            ? Response::allow()
            : Response::deny('You can only delete your own messages.');
    }

    /**
     * The sender, and still a member of the conversation.
     */
    private function isActiveAuthor(User $user, Message $message): bool
    {
        return (int) $message->sender_id === (int) $user->getKey()
            && ConversationParticipant::query()
                ->where('conversation_id', $message->conversation_id)
                ->where('user_id', $user->getKey())
                ->exists();
    }
}
