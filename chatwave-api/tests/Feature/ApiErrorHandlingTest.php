<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiErrorHandlingTest extends TestCase
{
    use RefreshDatabase;

    public function test_not_found_responses_do_not_name_internal_classes(): void
    {
        $this->actingAs(User::factory()->create())
            ->getJson('/api/conversations/999999')
            ->assertNotFound()
            ->assertExactJson(['message' => 'Not found.']);
    }

    public function test_validation_errors_are_json_even_without_an_accept_header(): void
    {
        $this->post('/api/auth/login', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_api_requests_are_rate_limited(): void
    {
        $user = User::factory()->create();

        for ($i = 0; $i < 120; $i++) {
            $this->actingAs($user)->getJson('/api/auth/me')->assertOk();
        }

        $this->actingAs($user)->getJson('/api/auth/me')
            ->assertStatus(429)
            ->assertJsonStructure(['message', 'retry_after']);
    }
}
