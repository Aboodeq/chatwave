<?php

namespace Tests\Feature\Admin;

use App\Enums\Permission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminAccessTest extends TestCase
{
    use RefreshDatabase;

    private const ENDPOINTS = ['/api/admin/overview', '/api/admin/users', '/api/admin/activity', '/api/admin/system'];

    public function test_only_admins_can_use_the_admin_api(): void
    {
        foreach (self::ENDPOINTS as $endpoint) {
            $this->getJson($endpoint)->assertUnauthorized();
        }

        $this->actingAs(User::factory()->create());

        foreach (self::ENDPOINTS as $endpoint) {
            $this->getJson($endpoint)->assertForbidden();
        }

        $this->actingAs(User::factory()->admin()->create());

        foreach (self::ENDPOINTS as $endpoint) {
            $this->getJson($endpoint)->assertOk();
        }
    }

    public function test_the_signed_in_user_includes_their_role(): void
    {
        $this->actingAs(User::factory()->admin()->create())
            ->getJson('/api/auth/me')
            ->assertJsonPath('user.role.key', 'admin')
            ->assertJsonPath('user.permissions', Permission::values());
    }

    public function test_the_make_admin_command_grants_and_revokes_access(): void
    {
        $person = User::factory()->withPhone('+962791234567')->create();

        $this->artisan('chatwave:make-admin', ['account' => '+962 79 123 4567'])->assertSuccessful();
        $this->assertTrue($person->fresh()->isAdmin());

        $this->artisan('chatwave:make-admin', ['account' => '+962791234567', '--revoke' => true])->assertSuccessful();
        $this->assertFalse($person->fresh()->isAdmin());

        $this->artisan('chatwave:make-admin', ['account' => 'nobody@example.com'])->assertFailed();
    }
}
