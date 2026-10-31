<?php

namespace Tests;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function privateConversation(User $first, User $second): Conversation
    {
        $conversation = Conversation::create(['type' => 'private', 'created_by' => $first->id]);

        $conversation->participants()->attach(
            [$first->id, $second->id],
            ['role' => 'member', 'joined_at' => now()],
        );

        return $conversation;
    }

    protected function groupConversation(User $owner, User ...$members): Conversation
    {
        $conversation = Conversation::create(['type' => 'group', 'created_by' => $owner->id]);
        $conversation->group()->create(['name' => 'Team']);

        $conversation->participants()->attach($owner->id, ['role' => 'admin', 'joined_at' => now()]);

        foreach ($members as $member) {
            $conversation->participants()->attach($member->id, ['role' => 'member', 'joined_at' => now()]);
        }

        return $conversation;
    }

    protected function message(Conversation $conversation, User $sender, string $body = 'Hello'): Message
    {
        return $conversation->messages()->create([
            'sender_id' => $sender->id,
            'type' => 'text',
            'body' => $body,
        ]);
    }

    /**
     * Sanctum caches the resolved user on the guard; reset it so the next request
     * authenticates from scratch (needed when a test revokes or expires a token).
     */
    protected function forgetAuthentication(): void
    {
        $this->app['auth']->forgetGuards();
    }
}
