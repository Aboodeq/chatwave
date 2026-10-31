<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LastSeenBackfillTest extends TestCase
{
    use RefreshDatabase;

    public function test_last_seen_is_filled_from_earlier_activity(): void
    {
        [$tokenUser, $sender, $idle, $known] = User::factory()->count(4)->create();
        $known->forceFill(['last_seen_at' => '2026-10-30 08:00:00'])->save();

        $tokenUser->createToken('web')->accessToken->forceFill(['last_used_at' => '2026-10-29 10:00:00'])->save();
        $conversation = $this->privateConversation($sender, $idle);
        $message = $this->message($conversation, $sender);
        $message->forceFill(['created_at' => '2026-10-28 09:30:00'])->save();

        $migration = require database_path('migrations/2026_10_31_000005_backfill_users_last_seen_at.php');
        $migration->up();

        $this->assertSame('2026-10-29 10:00:00', $tokenUser->fresh()->last_seen_at->format('Y-m-d H:i:s'));
        $this->assertSame('2026-10-28 09:30:00', $sender->fresh()->last_seen_at->format('Y-m-d H:i:s'));
        $this->assertNull($idle->fresh()->last_seen_at);
        $this->assertSame('2026-10-30 08:00:00', $known->fresh()->last_seen_at->format('Y-m-d H:i:s'));
    }
}
