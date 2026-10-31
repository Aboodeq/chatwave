<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PresenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_using_the_app_marks_you_online(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->getJson('/api/auth/me')->assertOk();

        $user->refresh();
        $this->assertTrue($user->is_online);
        $this->assertTrue($user->last_seen_at->gte(now()->subSeconds(5)));
    }

    public function test_activity_is_written_at_most_once_a_minute(): void
    {
        $user = User::factory()->create();
        $this->freezeSecond();

        $this->actingAs($user)->getJson('/api/auth/me');
        $first = $user->fresh()->last_seen_at;

        $this->travel(30)->seconds();
        $this->actingAs($user)->getJson('/api/auth/me');
        $this->assertTrue($user->fresh()->last_seen_at->eq($first));

        $this->travel(31)->seconds();
        $this->actingAs($user)->getJson('/api/auth/me');
        $this->assertTrue($user->fresh()->last_seen_at->gt($first));
    }

    public function test_others_see_you_online_then_last_seen_after_two_quiet_minutes(): void
    {
        [$me, $ann] = User::factory()->count(2)->create();
        $conversation = $this->privateConversation($me, $ann);

        $this->actingAs($ann)->getJson('/api/auth/me');

        $this->actingAs($me)->getJson("/api/conversations/{$conversation->id}")
            ->assertJsonPath('conversation.is_online', true)
            ->assertJsonPath('conversation.participant.is_online', true);

        $this->travel(3)->minutes();

        $this->actingAs($me)->getJson("/api/conversations/{$conversation->id}")
            ->assertJsonPath('conversation.is_online', false)
            ->assertJsonPath('conversation.last_seen_at', fn ($value) => is_string($value));
    }

    public function test_presence_can_be_hidden(): void
    {
        [$me, $ann] = User::factory()->count(2)->create();
        $conversation = $this->privateConversation($me, $ann);
        $ann->forceFill(['show_online_status' => false, 'is_online' => true, 'last_seen_at' => now()])->save();

        $this->actingAs($me)->getJson("/api/conversations/{$conversation->id}")
            ->assertJsonPath('conversation.is_online', false)
            ->assertJsonPath('conversation.last_seen_at', null)
            ->assertJsonPath('conversation.participant.last_seen_at', null);
    }

    public function test_signing_out_marks_you_offline_right_away(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)->postJson('/api/auth/logout')->assertOk();

        $this->assertFalse($user->fresh()->is_online);
        $this->assertFalse($user->fresh()->isOnline());
    }
}
