<?php

namespace Tests\Feature\Admin;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminOverviewTest extends TestCase
{
    use RefreshDatabase;

    private function createMessage(User $sender, Conversation $conversation, string $utc): Message
    {
        $message = Message::create(['conversation_id' => $conversation->id, 'sender_id' => $sender->id, 'type' => 'text', 'body' => 'Hi']);
        $message->forceFill(['created_at' => $utc])->saveQuietly();

        return $message;
    }

    public function test_daily_activity_is_grouped_by_the_viewers_calendar_day(): void
    {
        // 21:30 UTC on Oct 30 is already Oct 31 in Amman (UTC+3).
        $this->travelTo(CarbonImmutable::parse('2026-11-01 12:00:00', 'UTC'));

        $admin = User::factory()->admin()->create(['created_at' => '2026-10-20 10:00:00']);
        $other = User::factory()->create(['created_at' => '2026-10-30 22:00:00']);
        $conversation = Conversation::create(['type' => 'private', 'created_by' => $admin->id]);

        $this->createMessage($admin, $conversation, '2026-10-30 21:30:00');
        $this->createMessage($other, $conversation, '2026-10-30 22:30:00');
        $this->createMessage($admin, $conversation, '2026-11-01 08:00:00');

        $response = $this->actingAs($admin)
            ->getJson('/api/admin/overview?days=7&timezone=Asia/Amman')
            ->assertOk()
            ->assertJsonPath('range.days', 7)
            ->assertJsonPath('range.from', '2026-10-26')
            ->assertJsonPath('range.to', '2026-11-01')
            ->assertJsonCount(7, 'series');

        $series = collect($response->json('series'))->keyBy('date');
        $this->assertSame(['messages' => 0, 'senders' => 0, 'sign_ups' => 0], collect($series['2026-10-30'])->except('date')->all());
        $this->assertSame(['messages' => 2, 'senders' => 2, 'sign_ups' => 1], collect($series['2026-10-31'])->except('date')->all());
        $this->assertSame(['messages' => 1, 'senders' => 1, 'sign_ups' => 0], collect($series['2026-11-01'])->except('date')->all());

        $response
            ->assertJsonPath('totals.people', 2)
            ->assertJsonPath('totals.messages', 3)
            ->assertJsonPath('totals.sign_ups', 1)
            ->assertJsonPath('totals.admins', 1)
            ->assertJsonPath('totals.conversations', 1);
    }

    public function test_the_range_and_time_zone_are_validated(): void
    {
        $this->actingAs(User::factory()->admin()->create());

        $this->getJson('/api/admin/overview?days=12')->assertJsonValidationErrors(['days']);
        $this->getJson('/api/admin/overview?timezone=Mars/Olympus')->assertJsonValidationErrors(['timezone']);
        $this->getJson('/api/admin/overview')->assertOk()->assertJsonCount(30, 'series');
    }
}
