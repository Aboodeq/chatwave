<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SessionTest extends TestCase
{
    use RefreshDatabase;

    private const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';

    public function test_sign_in_names_the_session_after_the_browser(): void
    {
        User::factory()->create(['email' => 'ann@example.com']);

        $token = $this->withHeader('User-Agent', self::CHROME)
            ->postJson('/api/auth/login', ['email' => 'ann@example.com', 'password' => 'password'])
            ->json('token');

        $this->withToken($token)->getJson('/api/sessions')
            ->assertOk()
            ->assertJsonPath('sessions.0.user_agent', self::CHROME)
            ->assertJsonPath('sessions.0.current', true);
    }

    public function test_lists_active_sessions_with_this_device_first(): void
    {
        $user = User::factory()->create();
        $user->createToken('phone');
        $user->createToken('expired', ['*'], now()->subMinute());
        $here = $user->createToken(self::CHROME);

        $this->withToken($here->plainTextToken)->getJson('/api/sessions')
            ->assertOk()
            ->assertJsonCount(2, 'sessions')
            ->assertJsonPath('sessions.0.id', $here->accessToken->id)
            ->assertJsonPath('sessions.0.current', true)
            ->assertJsonPath('sessions.1.current', false);
    }

    public function test_can_sign_out_another_device_but_not_someone_elses(): void
    {
        $user = User::factory()->create();
        $here = $user->createToken('here');
        $phone = $user->createToken('phone');
        $stranger = User::factory()->create()->createToken('theirs');

        $this->withToken($here->plainTextToken)->deleteJson("/api/sessions/{$stranger->accessToken->id}")->assertNotFound();
        $this->withToken($here->plainTextToken)->deleteJson("/api/sessions/{$phone->accessToken->id}")->assertOk();

        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $phone->accessToken->id]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $stranger->accessToken->id]);
    }

    public function test_can_sign_out_all_other_devices(): void
    {
        $user = User::factory()->create();
        $here = $user->createToken('here');
        $user->createToken('phone');
        $user->createToken('tablet');

        $this->withToken($here->plainTextToken)->deleteJson('/api/sessions')
            ->assertOk()
            ->assertJsonPath('signed_out', 2);

        $this->assertSame(1, $user->tokens()->count());
        $this->forgetAuthentication();
        $this->withToken($here->plainTextToken)->getJson('/api/auth/me')->assertOk();
    }
}
