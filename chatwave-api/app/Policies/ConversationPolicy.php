<?php

namespace App\Policies;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ConversationPolicy
{
    /**
     * Participants can read and post. Everyone else gets a 404 so conversation IDs can't be probed.
     */
    public function view(User $user, Conversation $conversation): Response
    {
        return $conversation->hasParticipant($user)
            ? Response::allow()
            : Response::denyAsNotFound();
    }

    /**
     * Posting a message. In a private conversation, a block in either direction stops it.
     */
    public function send(User $user, Conversation $conversation): Response
    {
        if (! $conversation->hasParticipant($user)) {
            return Response::denyAsNotFound();
        }

        if ($conversation->isPrivate()) {
            $other = $conversation->participants()->whereKeyNot($user->getKey())->first();

            if ($other && $user->hasBlocked($other)) {
                return Response::deny(__('You blocked this person. Unblock them to send a message.'));
            }

            if ($other && $user->isBlockedBy($other)) {
                return Response::deny(__("You can't send messages to this person."));
            }
        }

        return Response::allow();
    }

    /**
     * Only group conversations can be left. Leaving a private one used to strand the other
     * person: they could keep sending messages that would never be seen.
     */
    public function leave(User $user, Conversation $conversation): Response
    {
        if (! $conversation->hasParticipant($user)) {
            return Response::denyAsNotFound();
        }

        return $conversation->isPrivate()
            ? Response::deny(__('Private conversations cannot be left.'))
            : Response::allow();
    }
}
