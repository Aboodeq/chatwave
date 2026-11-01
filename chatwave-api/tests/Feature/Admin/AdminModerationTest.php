<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminModerationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->admin()->create();
    }

    public function test_suspending_signs_the_person_out_and_blocks_sign_in(): void
    {
        $person = User::factory()->create(['email' => 'sam@example.com']);
        $token = $person->createToken('phone')->plainTextToken;

        $this->actingAs($this->admin)
            ->postJson("/api/admin/users/{$person->id}/suspension", ['reason' => 'Sending spam'])
            ->assertOk()
            ->assertJsonPath('user.suspension_reason', 'Sending spam');

        $this->assertTrue($person->fresh()->isSuspended());
        $this->assertSame(0, $person->tokens()->count());
        $this->assertDatabaseHas('admin_actions', ['action' => 'user.suspended', 'target_user_id' => $person->id, 'admin_id' => $this->admin->id]);

        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/auth/me')->assertUnauthorized();

        $this->postJson('/api/auth/login', ['email' => 'sam@example.com', 'password' => 'password'])
            ->assertForbidden()
            ->assertJsonPath('code', 'account_suspended');
        $this->assertSame(0, $person->tokens()->count());
    }

    public function test_a_token_that_outlives_the_suspension_is_refused(): void
    {
        $person = User::factory()->suspended()->create();
        $token = $person->createToken('phone')->plainTextToken;

        $this->withToken($token)->getJson('/api/conversations')
            ->assertForbidden()
            ->assertJsonPath('code', 'account_suspended');

        $this->assertSame(0, $person->tokens()->count());
    }

    public function test_restoring_lets_the_person_sign_in_again(): void
    {
        $person = User::factory()->suspended()->create(['email' => 'sam@example.com']);

        $this->actingAs($this->admin)->deleteJson("/api/admin/users/{$person->id}/suspension")->assertOk()->assertJsonPath('user.suspended_at', null);

        $this->postJson('/api/auth/login', ['email' => 'sam@example.com', 'password' => 'password'])->assertOk();
        $this->assertDatabaseHas('admin_actions', ['action' => 'user.restored', 'target_user_id' => $person->id]);
    }

    public function test_admins_cannot_suspend_themselves_or_other_admins(): void
    {
        $otherAdmin = User::factory()->admin()->create();

        $this->actingAs($this->admin)
            ->postJson("/api/admin/users/{$this->admin->id}/suspension")
            ->assertJsonValidationErrors(['user' => "You can't suspend your own account."]);

        $this->postJson("/api/admin/users/{$otherAdmin->id}/suspension")
            ->assertJsonValidationErrors(['user' => 'Remove admin access before suspending this person.']);

        $this->assertFalse($otherAdmin->fresh()->isSuspended());
    }

    public function test_roles_can_be_changed_except_your_own(): void
    {
        $person = User::factory()->create();

        $this->actingAs($this->admin)
            ->putJson("/api/admin/users/{$person->id}/role", ['role' => 'admin'])
            ->assertOk()
            ->assertJsonPath('user.role', 'admin');

        $this->assertDatabaseHas('admin_actions', ['action' => 'user.role_changed', 'target_user_id' => $person->id]);

        $this->putJson("/api/admin/users/{$this->admin->id}/role", ['role' => 'user'])
            ->assertJsonValidationErrors(['user' => "You can't change your own role."]);

        $this->putJson("/api/admin/users/{$person->id}/role", ['role' => 'owner'])->assertJsonValidationErrors(['role']);
    }

    public function test_suspended_people_cannot_be_made_admins(): void
    {
        $person = User::factory()->suspended()->create();

        $this->actingAs($this->admin)
            ->putJson("/api/admin/users/{$person->id}/role", ['role' => 'admin'])
            ->assertJsonValidationErrors(['role' => 'Restore this account before making it an admin.']);
    }

    public function test_signing_someone_out_everywhere(): void
    {
        $person = User::factory()->create();
        $person->createToken('laptop');
        $person->createToken('phone');

        $this->actingAs($this->admin)->deleteJson("/api/admin/users/{$person->id}/sessions")->assertOk();

        $this->assertSame(0, $person->tokens()->count());
        $this->assertDatabaseHas('admin_actions', ['action' => 'user.signed_out', 'target_user_id' => $person->id]);

        $this->getJson('/api/admin/activity')
            ->assertOk()
            ->assertJsonPath('data.0.action', 'user.signed_out')
            ->assertJsonPath('data.0.details.devices', 2);
    }

    public function test_suspended_people_do_not_appear_in_people_search(): void
    {
        User::factory()->suspended()->create(['name' => 'Hidden Harry']);

        $this->actingAs(User::factory()->create())
            ->getJson('/api/users?search=harry')
            ->assertOk()
            ->assertJsonCount(0, 'users');
    }
}
