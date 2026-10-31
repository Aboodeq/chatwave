<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BlockTest extends TestCase
{
    use RefreshDatabase;

    public function test_blocking_stops_messages_in_both_directions_until_unblocked(): void
    {
        [$me, $ann] = User::factory()->count(2)->create();
        $conversation = $this->privateConversation($me, $ann);

        $this->actingAs($me)->postJson("/api/users/{$ann->id}/block")->assertOk();

        $this->actingAs($me)->getJson("/api/conversations/{$conversation->id}")
            ->assertJsonPath('conversation.is_blocked', true)
            ->assertJsonPath('conversation.can_message', false);

        $this->actingAs($me)->postJson("/api/conversations/{$conversation->id}/messages", ['body' => 'hi'])
            ->assertForbidden()
            ->assertJson(['message' => 'You blocked this person. Unblock them to send a message.']);

        $this->actingAs($ann)->getJson("/api/conversations/{$conversation->id}")
            ->assertJsonPath('conversation.is_blocked', false)
            ->assertJsonPath('conversation.can_message', false);

        $this->actingAs($ann)->postJson("/api/conversations/{$conversation->id}/messages", ['body' => 'hello?'])
            ->assertForbidden()
            ->assertJson(['message' => "You can't send messages to this person."]);

        $this->actingAs($me)->deleteJson("/api/users/{$ann->id}/block")->assertOk();

        $this->actingAs($ann)->postJson("/api/conversations/{$conversation->id}/messages", ['body' => 'hello again'])
            ->assertCreated();
    }

    public function test_blocked_people_cannot_start_a_conversation_or_see_your_presence(): void
    {
        [$me, $ann] = User::factory()->count(2)->create();
        $conversation = $this->privateConversation($me, $ann);
        $me->forceFill(['is_online' => true, 'last_seen_at' => now()])->save();

        $this->actingAs($me)->postJson("/api/users/{$ann->id}/block")->assertOk();

        $this->actingAs($ann)->postJson('/api/conversations', ['user_id' => $me->id])
            ->assertForbidden()
            ->assertJson(['message' => "You can't message this person."]);

        $this->actingAs($ann)->getJson("/api/conversations/{$conversation->id}")
            ->assertJsonPath('conversation.is_online', false)
            ->assertJsonPath('conversation.last_seen_at', null)
            ->assertJsonPath('conversation.participant.is_online', false)
            ->assertJsonPath('conversation.participant.last_seen_at', null);

        // The person who blocked can still open the chat (to unblock from it).
        $this->actingAs($me)->postJson('/api/conversations', ['user_id' => $ann->id])->assertOk();
    }

    public function test_lists_blocked_people(): void
    {
        [$me, $ann, $bob] = User::factory()->count(3)->create();

        $this->actingAs($me)->postJson("/api/users/{$ann->id}/block")->assertOk();
        $this->actingAs($me)->postJson("/api/users/{$bob->id}/block")->assertOk();
        $this->actingAs($me)->deleteJson("/api/users/{$bob->id}/block")->assertOk();

        $this->actingAs($me)->getJson('/api/blocks')
            ->assertOk()
            ->assertJsonCount(1, 'users')
            ->assertJsonPath('users.0.id', $ann->id)
            ->assertJsonMissingPath('users.0.email');
    }

    public function test_cannot_block_yourself(): void
    {
        $me = User::factory()->create();

        $this->actingAs($me)->postJson("/api/users/{$me->id}/block")->assertUnprocessable();
    }
}
