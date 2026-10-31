<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConversationTest extends TestCase
{
    use RefreshDatabase;

    public function test_lists_own_conversations_by_latest_activity_with_unread_counts(): void
    {
        [$me, $ann, $bob] = User::factory()->count(3)->create();
        $older = $this->privateConversation($me, $ann);
        $newer = $this->privateConversation($me, $bob);
        $this->privateConversation($ann, $bob); // not mine

        $this->travel(1)->minutes();
        $this->actingAs($ann)->postJson("/api/conversations/{$older->id}/messages", ['body' => 'one'])->assertCreated();
        $this->actingAs($ann)->postJson("/api/conversations/{$older->id}/messages", ['body' => 'two'])->assertCreated();

        $response = $this->actingAs($me)->getJson('/api/conversations')->assertOk();

        $this->assertSame([$older->id, $newer->id], array_column($response->json('conversations'), 'id'));
        $response
            ->assertJsonPath('conversations.0.unread_count', 2)
            ->assertJsonPath('conversations.0.last_message.body', 'two')
            ->assertJsonPath('conversations.0.name', $ann->name)
            ->assertJsonPath('conversations.1.unread_count', 0);
    }

    public function test_other_peoples_contact_details_are_not_exposed(): void
    {
        [$me, $ann] = User::factory()->count(2)->create();
        $conversation = $this->privateConversation($me, $ann);

        $this->actingAs($me)->getJson("/api/conversations/{$conversation->id}")
            ->assertOk()
            ->assertJsonPath('conversation.participant.id', $ann->id)
            ->assertJsonMissingPath('conversation.participant.email')
            ->assertJsonMissingPath('conversation.participant.phone');
    }

    public function test_starting_a_conversation_reuses_the_existing_one(): void
    {
        [$me, $ann] = User::factory()->count(2)->create();

        $first = $this->actingAs($me)->postJson('/api/conversations', ['user_id' => $ann->id])
            ->assertCreated()
            ->json('conversation.id');

        $this->actingAs($me)->postJson('/api/conversations', ['user_id' => $ann->id])
            ->assertOk()
            ->assertJsonPath('conversation.id', $first);

        $this->actingAs($ann)->postJson('/api/conversations', ['user_id' => $me->id])
            ->assertOk()
            ->assertJsonPath('conversation.id', $first);

        $this->assertSame(1, Conversation::count());
    }

    public function test_cannot_start_a_conversation_with_yourself_or_a_missing_user(): void
    {
        $me = User::factory()->create();

        $this->actingAs($me)->postJson('/api/conversations', ['user_id' => $me->id])
            ->assertJsonValidationErrors(['user_id' => 'You cannot start a conversation with yourself.']);

        $this->actingAs($me)->postJson('/api/conversations', ['user_id' => 999])
            ->assertJsonValidationErrors(['user_id']);
    }

    public function test_non_participants_get_not_found(): void
    {
        [$ann, $bob, $outsider] = User::factory()->count(3)->create();
        $conversation = $this->privateConversation($ann, $bob);

        $this->actingAs($outsider);
        $this->getJson("/api/conversations/{$conversation->id}")->assertNotFound()->assertExactJson(['message' => 'Not found.']);
        $this->getJson("/api/conversations/{$conversation->id}/messages")->assertNotFound();
        $this->postJson("/api/conversations/{$conversation->id}/messages", ['body' => 'hi'])->assertNotFound();
        $this->postJson("/api/conversations/{$conversation->id}/read")->assertNotFound();
        $this->deleteJson("/api/conversations/{$conversation->id}")->assertNotFound();
    }

    public function test_private_conversations_cannot_be_left(): void
    {
        // Leaving used to strand the other person in a conversation nobody would read.
        [$me, $ann] = User::factory()->count(2)->create();
        $conversation = $this->privateConversation($me, $ann);

        $this->actingAs($me)->deleteJson("/api/conversations/{$conversation->id}")
            ->assertForbidden()
            ->assertJson(['message' => 'Private conversations cannot be left.']);

        $this->assertTrue($conversation->hasParticipant($me));
    }

    public function test_group_conversations_can_be_left(): void
    {
        [$owner, $me] = User::factory()->count(2)->create();
        $group = $this->groupConversation($owner, $me);

        $this->actingAs($me)->deleteJson("/api/conversations/{$group->id}")->assertOk();

        $this->assertFalse($group->hasParticipant($me));
        $this->actingAs($me)->getJson("/api/conversations/{$group->id}")->assertNotFound();
    }
}
