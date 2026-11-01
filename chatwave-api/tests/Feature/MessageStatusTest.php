<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\Role;
use App\Models\User;
use App\Services\ConversationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MessageStatusTest extends TestCase
{
    use RefreshDatabase;

    private User $me;

    private User $ann;

    private Conversation $conversation;

    protected function setUp(): void
    {
        parent::setUp();

        [$this->me, $this->ann] = User::factory()->count(2)->create();
        $this->conversation = app(ConversationService::class)->findOrCreatePrivateConversation($this->me, $this->ann);
    }

    private function send(User $from, string $body = 'Hi'): int
    {
        return $this->actingAs($from)
            ->postJson("/api/conversations/{$this->conversation->id}/messages", ['body' => $body])
            ->assertCreated()
            ->json('message.id');
    }

    private function statusOfMine(): ?string
    {
        return $this->actingAs($this->me)
            ->getJson("/api/conversations/{$this->conversation->id}/messages")
            ->json('messages.0.status');
    }

    public function test_sent_then_delivered_when_the_recipient_comes_online_then_seen(): void
    {
        // Ann is offline: the message is stored but hasn't reached her.
        $this->actingAs($this->me)
            ->postJson("/api/conversations/{$this->conversation->id}/messages", ['body' => 'Are you there?'])
            ->assertJsonPath('message.status', 'sent');
        $this->assertSame('sent', $this->statusOfMine());

        // Ann's app comes online and fetches her conversations.
        $this->actingAs($this->ann)->getJson('/api/conversations')->assertOk();
        $this->assertSame('delivered', $this->statusOfMine());
        $this->actingAs($this->me)->getJson('/api/conversations')
            ->assertJsonPath('conversations.0.last_message.status', 'delivered');

        // She opens the chat.
        $this->actingAs($this->ann)->postJson("/api/conversations/{$this->conversation->id}/read")->assertOk();
        $this->assertSame('seen', $this->statusOfMine());

        $this->actingAs($this->me)->getJson("/api/conversations/{$this->conversation->id}/messages")
            ->assertJsonPath('receipts.read_up_to', (int) $this->conversation->messages()->max('id'));
    }

    public function test_other_peoples_messages_have_no_status(): void
    {
        $this->send($this->ann);

        $this->assertNull($this->statusOfMine());
    }

    public function test_turning_off_read_receipts_hides_seen_in_both_directions(): void
    {
        $this->send($this->me);
        $this->actingAs($this->ann)->patchJson('/api/profile', ['read_receipts' => false])->assertOk();
        $this->actingAs($this->ann)->postJson("/api/conversations/{$this->conversation->id}/read")->assertOk();

        $this->assertSame('delivered', $this->statusOfMine());
        $this->actingAs($this->me)->getJson("/api/conversations/{$this->conversation->id}/messages")
            ->assertJsonPath('receipts.read_up_to', null);

        // Ann turns them back on, but now I've turned mine off: I don't see hers either.
        $this->actingAs($this->ann)->patchJson('/api/profile', ['read_receipts' => true])->assertOk();
        $this->actingAs($this->me)->patchJson('/api/profile', ['read_receipts' => false])->assertOk();
        $this->assertSame('delivered', $this->statusOfMine());
    }

    public function test_roles_without_message_status_see_no_ticks(): void
    {
        Role::member()->update(['permissions' => ['receipts.hide', 'presence.hide']]);
        Role::forgetCache();
        $this->send($this->me);

        $this->actingAs($this->me)->getJson("/api/conversations/{$this->conversation->id}/messages")
            ->assertJsonPath('messages.0.status', null)
            ->assertJsonPath('receipts', null);
    }

    public function test_reading_up_to_a_message_leaves_newer_ones_unread(): void
    {
        $first = $this->send($this->me, 'one');
        $this->send($this->me, 'two');

        // Ann's app loads the chat (both arrive), but she has only seen the first so far.
        $this->actingAs($this->ann)->getJson("/api/conversations/{$this->conversation->id}/messages")->assertOk();
        $this->actingAs($this->ann)->postJson("/api/conversations/{$this->conversation->id}/read", ['message_id' => $first])->assertOk();

        $statuses = collect($this->actingAs($this->me)->getJson("/api/conversations/{$this->conversation->id}/messages")->json('messages'))
            ->pluck('status', 'body');
        $this->assertSame(['two' => 'delivered', 'one' => 'seen'], $statuses->all());

        $this->actingAs($this->ann)->getJson('/api/conversations')->assertJsonPath('conversations.0.unread_count', 1);
    }

    public function test_checking_for_deliveries_writes_nothing_when_nothing_is_new(): void
    {
        $this->send($this->me);
        $this->actingAs($this->ann)->getJson('/api/conversations')->assertOk();

        DB::enableQueryLog();
        $this->actingAs($this->ann)->getJson('/api/conversations')->assertOk();
        $writes = collect(DB::getQueryLog())->filter(fn ($query) => str_starts_with(strtolower($query['query']), 'update "conversation_participants"'));
        DB::disableQueryLog();

        $this->assertCount(0, $writes);
    }

    public function test_deleted_messages_do_not_count_as_new(): void
    {
        $id = $this->send($this->me);
        Message::find($id)->delete();

        $this->actingAs($this->ann)->getJson('/api/conversations')->assertJsonPath('conversations.0.unread_count', 0);
    }
}
