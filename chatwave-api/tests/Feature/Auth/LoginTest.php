<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    private function login(array $overrides = [])
    {
        return $this->postJson('/api/auth/login', [
            'email' => 'ann@example.com',
            'password' => 'password',
            ...$overrides,
        ]);
    }

    public function test_user_can_log_in_with_a_token_that_expires_in_a_day(): void
    {
        User::factory()->create(['email' => 'ann@example.com']);

        $response = $this->login()
            ->assertOk()
            ->assertJsonStructure(['user' => ['id', 'name', 'email'], 'token', 'expires_at']);

        $expiresAt = Carbon::parse($response->json('expires_at'));
        $this->assertTrue($expiresAt->between(now()->addHours(23), now()->addHours(25)));

        $this->withToken($response->json('token'))
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.email', 'ann@example.com');
    }

    public function test_remember_me_issues_a_thirty_day_token(): void
    {
        User::factory()->create(['email' => 'ann@example.com']);

        $expiresAt = Carbon::parse($this->login(['remember' => true])->assertOk()->json('expires_at'));

        $this->assertTrue($expiresAt->between(now()->addDays(29), now()->addDays(31)));
    }

    public function test_email_is_case_insensitive(): void
    {
        User::factory()->create(['email' => 'ann@example.com']);

        $this->login(['email' => '  Ann@Example.COM '])->assertOk();
    }

    public function test_wrong_password_is_a_validation_error(): void
    {
        User::factory()->create(['email' => 'ann@example.com']);

        $this->login(['password' => 'not-my-password'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email'])
            ->assertJsonMissingPath('token');
    }

    public function test_login_works_with_the_database_session_driver(): void
    {
        // Regression: Auth::attempt() wrote to a sessions table that didn't exist (HTTP 500).
        config(['session.driver' => 'database']);
        User::factory()->create(['email' => 'ann@example.com']);

        $this->login()->assertOk();
    }

    public function test_account_is_locked_for_a_minute_after_five_failed_attempts(): void
    {
        User::factory()->create(['email' => 'ann@example.com']);

        for ($i = 0; $i < 5; $i++) {
            $this->login(['password' => "wrong-{$i}"])->assertUnprocessable();
        }

        // Even the right password is refused while locked.
        $this->login()
            ->assertStatus(429)
            ->assertJsonValidationErrors(['email']);

        $this->travel(61)->seconds();

        $this->login()->assertOk();
    }

    public function test_logout_revokes_the_token(): void
    {
        User::factory()->create(['email' => 'ann@example.com']);
        $token = $this->login()->json('token');

        $this->withToken($token)->postJson('/api/auth/logout')->assertOk();
        $this->forgetAuthentication();

        $this->withToken($token)->getJson('/api/auth/me')->assertUnauthorized();
    }

    public function test_expired_tokens_are_rejected(): void
    {
        User::factory()->create(['email' => 'ann@example.com']);
        $token = $this->login()->json('token');

        $this->travel(25)->hours();

        $this->withToken($token)->getJson('/api/auth/me')->assertUnauthorized();
    }

    public function test_unauthenticated_api_requests_get_json_even_without_an_accept_header(): void
    {
        $this->get('/api/auth/me')
            ->assertUnauthorized()
            ->assertJson(['message' => 'Unauthenticated.']);
    }
}
