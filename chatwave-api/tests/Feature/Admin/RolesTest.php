<?php

namespace Tests\Feature\Admin;

use App\Enums\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RolesTest extends TestCase
{
    use RefreshDatabase;

    private function role(array $permissions, string $name = 'Custom'): Role
    {
        return Role::create(['name' => $name, 'permissions' => $permissions]);
    }

    public function test_roles_are_listed_with_permissions_and_member_counts(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->count(2)->create();

        $this->actingAs($admin)->getJson('/api/admin/roles')
            ->assertOk()
            ->assertJsonPath('permissions', Permission::values())
            ->assertJsonPath('roles.0.key', 'admin')
            ->assertJsonPath('roles.0.locked', true)
            ->assertJsonPath('roles.0.users_count', 1)
            ->assertJsonPath('roles.1.key', 'member')
            ->assertJsonPath('roles.1.deletable', false)
            ->assertJsonPath('roles.1.users_count', 2)
            ->assertJsonPath('roles.2.name', 'Moderator');
    }

    public function test_admins_create_change_and_delete_roles(): void
    {
        $admin = User::factory()->admin()->create();
        $this->actingAs($admin);

        $id = $this->postJson('/api/admin/roles', [
            'name' => 'Support',
            'description' => 'Helps people',
            'permissions' => ['admin.people', 'messages.status', 'admin.people'],
        ])->assertCreated()->assertJsonPath('role.permissions', ['messages.status', 'admin.people'])->json('role.id');

        $this->putJson("/api/admin/roles/{$id}", ['name' => 'Support team', 'permissions' => ['messages.status', 'admin.overview']])
            ->assertOk()
            ->assertJsonPath('role.name', 'Support team')
            ->assertJsonPath('role.permissions', ['messages.status', 'admin.overview']);

        $person = User::factory()->withRole(Role::find($id))->create();

        $this->deleteJson("/api/admin/roles/{$id}")->assertOk()->assertJsonPath('moved_to_member', 1);
        $this->assertTrue($person->fresh()->currentRole()->isMember());

        $this->getJson('/api/admin/activity')
            ->assertJsonPath('data.0.action', 'role.deleted')
            ->assertJsonPath('data.1.action', 'role.updated')
            ->assertJsonPath('data.1.details.added', ['admin.overview'])
            ->assertJsonPath('data.1.details.removed', ['admin.people'])
            ->assertJsonPath('data.2.action', 'role.created');
    }

    public function test_built_in_roles_are_protected(): void
    {
        $this->actingAs(User::factory()->admin()->create());

        $this->putJson('/api/admin/roles/'.Role::admin()->id, ['name' => 'Admin', 'permissions' => []])
            ->assertJsonValidationErrors(['role']);
        $this->deleteJson('/api/admin/roles/'.Role::member()->id)->assertJsonValidationErrors(['role']);

        // Member's permissions can change, but it keeps its name.
        $this->putJson('/api/admin/roles/'.Role::member()->id, ['name' => 'Everyone', 'permissions' => ['messages.status']])
            ->assertOk()
            ->assertJsonPath('role.name', 'Member')
            ->assertJsonPath('role.permissions', ['messages.status']);
    }

    public function test_each_admin_area_needs_its_own_permission(): void
    {
        $viewer = User::factory()->withRole($this->role(['admin.people']))->create();
        $this->actingAs($viewer);

        $this->getJson('/api/admin/users')->assertOk();
        $this->getJson('/api/admin/roles')->assertOk();
        $this->getJson('/api/admin/overview')->assertForbidden();
        $this->getJson('/api/admin/system')->assertForbidden();
        $this->getJson('/api/admin/activity')->assertForbidden();
        $this->postJson('/api/admin/roles', ['name' => 'X', 'permissions' => []])->assertForbidden();
        $this->postJson('/api/admin/users/'.User::factory()->create()->id.'/suspension')->assertForbidden();

        $this->actingAs(User::factory()->create())->getJson('/api/admin/roles')->assertForbidden();
    }

    public function test_nobody_can_hand_out_more_access_than_they_have(): void
    {
        $managers = $this->role(['admin.people', 'admin.roles', 'messages.status'], 'Managers');
        $manager = User::factory()->withRole($managers)->create();
        $member = User::factory()->create();
        $this->actingAs($manager);

        $this->postJson('/api/admin/roles', ['name' => 'Sneaky', 'permissions' => ['admin.system']])
            ->assertJsonValidationErrors(['permissions']);

        $this->putJson("/api/admin/roles/{$managers->id}", ['name' => 'Managers', 'permissions' => ['admin.people', 'admin.roles', 'admin.system']])
            ->assertJsonValidationErrors(['role']);

        $this->putJson("/api/admin/users/{$member->id}/role", ['role_id' => Role::admin()->id])
            ->assertJsonValidationErrors(['role_id' => 'Only admins can give or take away the Admin role.']);

        $bigger = $this->role(['admin.people', 'admin.system'], 'Bigger');
        $this->putJson("/api/admin/users/{$member->id}/role", ['role_id' => $bigger->id])
            ->assertJsonValidationErrors(['role_id']);

        $smaller = $this->role(['admin.people'], 'Smaller');
        $this->putJson("/api/admin/users/{$member->id}/role", ['role_id' => $smaller->id])
            ->assertOk()
            ->assertJsonPath('user.role.name', 'Smaller');
    }

    public function test_only_admins_act_on_people_with_admin_access(): void
    {
        $moderators = Role::where('name', 'Moderator')->firstOrFail();
        $moderator = User::factory()->withRole($moderators)->create();
        $otherModerator = User::factory()->withRole($moderators)->create();
        $member = User::factory()->create();
        $this->actingAs($moderator);

        $this->postJson("/api/admin/users/{$member->id}/suspension")->assertOk();
        $this->postJson("/api/admin/users/{$otherModerator->id}/suspension")
            ->assertJsonValidationErrors(['user' => 'Only admins can do this to people who have admin access.']);
        $this->deleteJson("/api/admin/users/{$otherModerator->id}/sessions")->assertJsonValidationErrors(['user']);

        $this->actingAs(User::factory()->admin()->create())
            ->postJson("/api/admin/users/{$otherModerator->id}/suspension")
            ->assertOk();
    }

    public function test_hiding_read_receipts_and_online_status_follows_the_role(): void
    {
        $person = User::factory()->create();
        $this->actingAs($person);

        $this->patchJson('/api/profile', ['read_receipts' => false, 'show_online_status' => false])->assertOk()
            ->assertJsonPath('user.read_receipts', false);
        $this->assertFalse($person->fresh()->sendsReadReceipts());

        // Take both permissions away from Member: the settings can't be turned off, and
        // ones already off stop counting.
        Role::member()->update(['permissions' => ['messages.status']]);
        Role::forgetCache();

        $this->assertTrue($person->fresh()->sendsReadReceipts());
        $this->assertTrue($person->fresh()->sharesOnlineStatus());

        $this->patchJson('/api/profile', ['read_receipts' => false])
            ->assertJsonValidationErrors(['read_receipts' => "Your role doesn't allow turning off read receipts."]);
        $this->patchJson('/api/profile', ['show_online_status' => false])
            ->assertJsonValidationErrors(['show_online_status']);
        $this->patchJson('/api/profile', ['read_receipts' => true])->assertOk();
    }
}
