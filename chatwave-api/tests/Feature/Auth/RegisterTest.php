<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class RegisterTest extends TestCase
{
    use RefreshDatabase;

    private function register(array $overrides = [])
    {
        return $this->postJson('/api/auth/register', [
            'name' => 'Ann Lee',
            'email' => 'ann@example.com',
            'password' => 'secret-pass-1',
            'password_confirmation' => 'secret-pass-1',
            ...$overrides,
        ]);
    }

    public function test_user_can_register_and_is_signed_in(): void
    {
        $response = $this->register(['email' => ' Ann@Example.com '])
            ->assertCreated()
            ->assertJsonPath('user.email', 'ann@example.com')
            ->assertJsonStructure(['token', 'expires_at']);

        $user = User::firstWhere('email', 'ann@example.com');
        $this->assertNotNull($user);
        $this->assertTrue(Hash::check('secret-pass-1', $user->password));

        $this->withToken($response->json('token'))->getJson('/api/auth/me')->assertOk();
    }

    public function test_email_must_be_unique_regardless_of_letter_case(): void
    {
        User::factory()->create(['email' => 'ann@example.com']);

        $this->register(['email' => 'ANN@example.com'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => 'This email is already registered.']);
    }

    public function test_password_must_be_confirmed_and_at_least_eight_characters(): void
    {
        $this->register(['password' => 'short', 'password_confirmation' => 'short'])
            ->assertJsonValidationErrors(['password']);

        $this->register(['password_confirmation' => 'something-else'])
            ->assertJsonValidationErrors(['password' => 'Passwords do not match.']);
    }
}
