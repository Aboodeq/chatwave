<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserSearchTest extends TestCase
{
    use RefreshDatabase;

    public function test_finds_people_by_part_of_their_name(): void
    {
        $me = User::factory()->create(['name' => 'Maya Me']);
        $ann = User::factory()->create(['name' => 'Annabel Lee']);
        User::factory()->create(['name' => 'Bob Stone']);

        $this->actingAs($me)->getJson('/api/users?search=nabe')
            ->assertOk()
            ->assertJsonCount(1, 'users')
            ->assertJsonPath('users.0.id', $ann->id)
            ->assertJsonMissingPath('users.0.email');
    }

    public function test_excludes_the_current_user(): void
    {
        $me = User::factory()->create(['name' => 'Maya']);

        $this->actingAs($me)->getJson('/api/users?search=maya')->assertJsonCount(0, 'users');
    }

    public function test_finds_people_by_exact_email_only(): void
    {
        $me = User::factory()->create();
        $ann = User::factory()->create(['name' => 'Ann', 'email' => 'ann@company.test']);

        $this->actingAs($me)->getJson('/api/users?search=ANN@company.test')
            ->assertJsonPath('users.0.id', $ann->id);

        // Fragments of an address don't match, so the directory can't be mined for emails.
        $this->actingAs($me)->getJson('/api/users?search=company.test')->assertJsonCount(0, 'users');
    }

    public function test_like_wildcards_are_treated_literally(): void
    {
        $me = User::factory()->create();
        User::factory()->count(3)->create();

        $this->actingAs($me)->getJson('/api/users?search=%25%25')->assertJsonCount(0, 'users');
        $this->actingAs($me)->getJson('/api/users?search=__')->assertJsonCount(0, 'users');
    }

    public function test_search_term_is_required(): void
    {
        $me = User::factory()->create();

        $this->actingAs($me)->getJson('/api/users?search=a')->assertJsonValidationErrors(['search']);
        $this->actingAs($me)->getJson('/api/users')->assertJsonValidationErrors(['search']);
    }
}
