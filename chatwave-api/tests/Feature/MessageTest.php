<?php

namespace Tests\Feature;

use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MessageTest extends TestCase
{
    use RefreshDatabase;

    public function test_participants_can_send_messages(): void
    {
        [$me, $ann] = User::factory()->count(2)->create();
        $conversation = $this->privateConversation($me, $ann);
        $this->travel(5)->minutes();

        $this->actingAs($me)->postJson("/api/conversations/{$conversation->id}/messages", ['body' => 'Hello Ann'])
            ->assertCreated()
            ->assertJsonPath('message.body', 'Hello Ann')
            ->assertJsonPath('message.type', 'text')
            ->assertJsonPath('message.sender.id', $me->id)
            ->assertJsonMissingPath('message.sender.email');

        $this->assertTrue($conversation->fresh()->updated_at->isAfter(now()->subMinute()));
    }

    public function test_cannot_reply_to_a_message_from_another_conversation(): void
    {
        // Regression: the reply preview echoed any message by id, including private ones.
        [$alice, $bob, $mallory, $friend] = User::factory()->count(4)->create();
        $secret = $this->message($this->privateConversation($alice, $bob), $alice, 'TOP SECRET');
        $own = $this->privateConversation($mallory, $friend);

        $this->actingAs($mallory)
            ->postJson("/api/conversations/{$own->id}/messages", ['body' => 'hi', 'reply_to_id' => $secret->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['reply_to_id'])
            ->assertDontSee('TOP SECRET');
    }

    public function test_can_reply_within_the_conversation(): void
    {
        [$me, $ann] = User::factory()->count(2)->create();
        $conversation = $this->privateConversation($me, $ann);
        $original = $this->message($conversation, $ann, 'Lunch?');

        $this->actingAs($me)
            ->postJson("/api/conversations/{$conversation->id}/messages", ['body' => 'Yes!', 'reply_to_id' => $original->id])
            ->assertCreated()
            ->assertJsonPath('message.reply_to.id', $original->id)
            ->assertJsonPath('message.reply_to.body', 'Lunch?')
            ->assertJsonPath('message.reply_to.sender.name', $ann->name);
    }

    public function test_a_message_needs_a_body(): void
    {
        // Regression: sending "media_ids" made the body optional, creating empty messages.
        [$me, $ann] = User::factory()->count(2)->create();
        $conversation = $this->privateConversation($me, $ann);

        $this->actingAs($me)
            ->postJson("/api/conversations/{$conversation->id}/messages", ['media_ids' => [1], 'type' => 'image'])
            ->assertJsonValidationErrors(['body']);

        $this->actingAs($me)
            ->postJson("/api/conversations/{$conversation->id}/messages", ['body' => '   '])
            ->assertJsonValidationErrors(['body']);

        $this->assertSame(0, Message::count());
    }

    public function test_history_pages_return_every_message_exactly_once(): void
    {
        // Regression: paginating on created_at lost messages that shared a timestamp.
        [$me, $ann] = User::factory()->count(2)->create();
        $conversation = $this->privateConversation($me, $ann);
        $this->freezeSecond();
        for ($i = 1; $i <= 65; $i++) {
            $this->message($conversation, $i % 2 ? $me : $ann, "m{$i}");
        }

        $ids = [];
        $cursor = null;
        $pages = 0;
        do {
            $page = $this->actingAs($me)
                ->getJson("/api/conversations/{$conversation->id}/messages".($cursor ? "?cursor={$cursor}" : ''))
                ->assertOk();
            $ids = [...$ids, ...array_column($page->json('messages'), 'id')];
            $cursor = $page->json('next_cursor');
            $pages++;
        } while ($cursor && $pages < 10);

        $this->assertCount(65, $ids);
        $this->assertCount(65, array_unique($ids));
        $this->assertSame($ids, collect($ids)->sortDesc()->values()->all(), 'Newest first');
    }

    public function test_only_the_author_can_edit_or_delete(): void
    {
        [$me, $ann] = User::factory()->count(2)->create();
        $conversation = $this->privateConversation($me, $ann);
        $message = $this->message($conversation, $me, 'Helo');

        $this->actingAs($ann)->putJson("/api/messages/{$message->id}", ['body' => 'hacked'])->assertForbidden();
        $this->actingAs($ann)->deleteJson("/api/messages/{$message->id}")->assertForbidden();

        $this->actingAs($me)->putJson("/api/messages/{$message->id}", ['body' => 'Hello'])
            ->assertOk()
            ->assertJsonPath('message.body', 'Hello')
            ->assertJsonPath('message.is_edited', true);

        $this->actingAs($me)->deleteJson("/api/messages/{$message->id}")->assertOk();

        $this->actingAs($me)->getJson("/api/conversations/{$conversation->id}/messages")
            ->assertOk()
            ->assertJsonCount(0, 'messages');
    }

    public function test_authors_who_left_a_group_can_no_longer_edit(): void
    {
        [$owner, $me] = User::factory()->count(2)->create();
        $group = $this->groupConversation($owner, $me);
        $message = $this->message($group, $me, 'bye');

        $this->actingAs($me)->deleteJson("/api/conversations/{$group->id}")->assertOk();

        $this->actingAs($me)->putJson("/api/messages/{$message->id}", ['body' => 'edited later'])->assertForbidden();
    }

    public function test_mark_as_read_clears_unread_count_in_a_few_queries(): void
    {
        [$me, $ann] = User::factory()->count(2)->create();
        $conversation = $this->privateConversation($me, $ann);
        for ($i = 0; $i < 60; $i++) {
            $this->message($conversation, $ann, "m{$i}");
        }
        $this->message($conversation, $me, 'mine');

        DB::enableQueryLog();
        $this->actingAs($me)->postJson("/api/conversations/{$conversation->id}/read")->assertOk();
        $queries = count(DB::getQueryLog());
        DB::disableQueryLog();

        // Used to be two queries per unread message (~120 here); now it moves one marker.
        $this->assertLessThan(10, $queries);
        $pivot = $conversation->participants()->find($me->id)->pivot;
        $this->assertNotNull($pivot->last_read_at);
        $this->assertSame((int) $conversation->messages()->max('id'), (int) $pivot->last_read_message_id);

        $this->actingAs($me)->getJson('/api/conversations')->assertJsonPath('conversations.0.unread_count', 0);
    }
}
