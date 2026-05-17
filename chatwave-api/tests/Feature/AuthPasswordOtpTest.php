<?php

namespace Tests\Feature;

use App\Mail\PasswordResetOtpMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AuthPasswordOtpTest extends TestCase
{
    use RefreshDatabase;

    public function test_password_reset_otp_request_stores_code_and_sends_email(): void
    {
        Mail::fake();

        User::factory()->create([
            'email' => 'person@example.com',
        ]);

        $this->postJson('/api/auth/password/otp', [
            'email' => 'person@example.com',
        ])
            ->assertOk()
            ->assertJson([
                'expires_in' => 600,
            ]);

        Mail::assertSent(PasswordResetOtpMail::class, function (PasswordResetOtpMail $mail): bool {
            return $mail->hasTo('person@example.com') && strlen($mail->code) === 6;
        });

        $this->assertDatabaseHas('password_reset_otps', [
            'email' => 'person@example.com',
            'attempts' => 0,
            'verified_at' => null,
        ]);
    }

    public function test_password_can_be_reset_with_valid_otp(): void
    {
        $user = User::factory()->create([
            'email' => 'person@example.com',
            'password' => Hash::make('old-password'),
        ]);

        DB::table('password_reset_otps')->insert([
            'email' => 'person@example.com',
            'code_hash' => Hash::make('123456'),
            'attempts' => 0,
            'expires_at' => now()->addMinutes(10),
            'verified_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->postJson('/api/auth/password/reset', [
            'email' => 'person@example.com',
            'otp' => '123456',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertOk();

        $this->assertTrue(Hash::check('new-password', $user->fresh()->password));
        $this->assertDatabaseMissing('password_reset_otps', [
            'email' => 'person@example.com',
        ]);
    }
}
