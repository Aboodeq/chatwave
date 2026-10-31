<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    /** A 1x1 PNG, so the tests don't need the GD extension. */
    private function png(string $name = 'me.png'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
        ));
    }

    public function test_user_can_update_name_about_and_privacy(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->patchJson('/api/profile', [
            'name' => 'Ann Lee',
            'status_text' => 'Heads down today',
            'show_online_status' => false,
        ])
            ->assertOk()
            ->assertJsonPath('user.name', 'Ann Lee')
            ->assertJsonPath('user.status_text', 'Heads down today')
            ->assertJsonPath('user.show_online_status', false);

        // Clearing "about" stores empty text (the column is not nullable).
        $this->actingAs($user)->patchJson('/api/profile', ['status_text' => ''])
            ->assertOk()
            ->assertJsonPath('user.status_text', '');
    }

    public function test_profile_validation(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->patchJson('/api/profile', ['name' => 'A', 'status_text' => str_repeat('x', 161)])
            ->assertJsonValidationErrors(['name', 'status_text']);
    }

    public function test_user_can_upload_replace_and_remove_a_photo(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $first = $this->actingAs($user)->post('/api/profile/avatar', ['avatar' => $this->png()])
            ->assertOk()
            ->json('user.avatar');
        $firstPath = $user->fresh()->avatar;
        Storage::disk('public')->assertExists($firstPath);

        // Served by the API itself; no storage:link needed.
        $this->assertStringContainsString('/api/avatars/', $first);
        $this->get($first)->assertOk()->assertHeader('Content-Type', 'image/png');
        $this->get('/api/avatars/'.str_repeat('a', 40).'.png')->assertNotFound();
        $this->get('/api/avatars/..%2F..%2F.env')->assertNotFound();

        $this->actingAs($user)->post('/api/profile/avatar', ['avatar' => $this->png('new.png')])->assertOk();
        Storage::disk('public')->assertMissing($firstPath);
        Storage::disk('public')->assertExists($user->fresh()->avatar);

        $this->actingAs($user)->deleteJson('/api/profile/avatar')
            ->assertOk()
            ->assertJsonPath('user.avatar', null);
        $this->assertSame([], Storage::disk('public')->allFiles('avatars'));
    }

    public function test_only_images_are_accepted_as_photos(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $svg = UploadedFile::fake()->createWithContent('x.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
        $this->actingAs($user)->post('/api/profile/avatar', ['avatar' => $svg], ['Accept' => 'application/json'])
            ->assertJsonValidationErrors(['avatar']);

        $text = UploadedFile::fake()->create('notes.txt', 10, 'text/plain');
        $this->actingAs($user)->post('/api/profile/avatar', ['avatar' => $text], ['Accept' => 'application/json'])
            ->assertJsonValidationErrors(['avatar']);

        $this->assertNull($user->fresh()->avatar);
    }

    public function test_changing_password_requires_the_current_one_and_signs_out_other_devices(): void
    {
        $user = User::factory()->create(['password' => 'old-password']);
        $here = $user->createToken('here');
        $elsewhere = $user->createToken('elsewhere');

        $this->withToken($here->plainTextToken)->putJson('/api/profile/password', [
            'current_password' => 'not-it',
            'password' => 'brand-new-pass',
            'password_confirmation' => 'brand-new-pass',
        ])->assertJsonValidationErrors(['current_password' => "That isn't your current password."]);

        $this->withToken($here->plainTextToken)->putJson('/api/profile/password', [
            'current_password' => 'old-password',
            'password' => 'brand-new-pass',
            'password_confirmation' => 'brand-new-pass',
        ])
            ->assertOk()
            ->assertJsonPath('signed_out_sessions', 1);

        $this->assertTrue(Hash::check('brand-new-pass', $user->fresh()->password));
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $here->accessToken->id]);
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $elsewhere->accessToken->id]);
    }
}
