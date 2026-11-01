<?php

namespace Tests\Feature\Admin;

use App\Models\Contact;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminUsersTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->admin()->create(['name' => 'Ada Admin', 'email' => 'ada@example.com']);
        $this->actingAs($this->admin);
    }

    public function test_people_are_listed_with_contact_details_and_paginated(): void
    {
        User::factory()->count(24)->create();

        $this->getJson('/api/admin/users?per_page=10')
            ->assertOk()
            ->assertJsonCount(10, 'data')
            ->assertJsonPath('meta.total', 25)
            ->assertJsonPath('meta.last_page', 3)
            ->assertJsonStructure(['data' => [['id', 'name', 'email', 'phone', 'role', 'sign_up_method', 'messages_count', 'last_seen_at', 'suspended_at']]]);
    }

    public function test_search_matches_name_email_and_phone_digits(): void
    {
        User::factory()->create(['name' => 'Lina Haddad', 'email' => 'lina@example.com']);
        User::factory()->withPhone('+962791234567')->create(['name' => 'Omar Khalil']);

        $this->getJson('/api/admin/users?search=hadd')->assertJsonPath('data.0.name', 'Lina Haddad')->assertJsonCount(1, 'data');
        $this->getJson('/api/admin/users?search=LINA@')->assertJsonPath('data.0.name', 'Lina Haddad');
        $this->getJson('/api/admin/users?search='.urlencode('79 123'))->assertJsonPath('data.0.name', 'Omar Khalil')->assertJsonCount(1, 'data');
    }

    public function test_filters_by_status_role_and_sign_up_method(): void
    {
        User::factory()->suspended()->create(['name' => 'Suspended Sam']);
        User::factory()->withPhone()->create(['name' => 'Phone Person']);
        User::factory()->create(['name' => 'Regular Rita']);

        $this->getJson('/api/admin/users?status=suspended')->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Suspended Sam');
        $this->getJson('/api/admin/users?role='.Role::admin()->id)->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Ada Admin');
        $this->getJson('/api/admin/users?method=phone')->assertJsonCount(1, 'data')->assertJsonPath('data.0.sign_up_method', 'phone');
        $this->getJson('/api/admin/users?status=active')->assertJsonCount(3, 'data');
    }

    public function test_sorting(): void
    {
        User::factory()->create(['name' => 'Zed', 'last_seen_at' => now()->subDay()]);
        User::factory()->create(['name' => 'Amy', 'last_seen_at' => null]);

        $this->getJson('/api/admin/users?sort=name')->assertJsonPath('data.0.name', 'Ada Admin');
        $this->getJson('/api/admin/users?sort=-name')->assertJsonPath('data.0.name', 'Zed');
        // Never-seen people come last either way.
        $this->getJson('/api/admin/users?sort=-last_seen_at')->assertJsonPath('data.2.name', 'Amy');
        $this->getJson('/api/admin/users?sort=password')->assertJsonValidationErrors(['sort']);
    }

    public function test_a_person_shows_counts_devices_and_admin_history(): void
    {
        $person = User::factory()->create();
        $person->createToken('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)');
        Contact::create(['user_id' => $this->admin->id, 'contact_id' => $person->id, 'is_blocked' => true]);

        $this->postJson("/api/admin/users/{$person->id}/suspension", ['reason' => 'Spam'])->assertOk();

        $this->getJson("/api/admin/users/{$person->id}")
            ->assertOk()
            ->assertJsonPath('user.id', $person->id)
            ->assertJsonPath('stats.blocked_by', 1)
            ->assertJsonPath('stats.messages', 0)
            ->assertJsonCount(0, 'devices') // suspending signed them out
            ->assertJsonPath('activity.0.action', 'user.suspended')
            ->assertJsonPath('activity.0.details.reason', 'Spam')
            ->assertJsonPath('activity.0.admin.name', 'Ada Admin')
            ->assertJsonPath('is_last_admin', false);

        $this->getJson("/api/admin/users/{$this->admin->id}")->assertJsonPath('is_last_admin', true);
    }
}
