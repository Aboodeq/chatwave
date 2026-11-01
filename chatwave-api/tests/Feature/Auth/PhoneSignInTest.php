<?php

namespace Tests\Feature\Auth;

use App\Enums\VerificationPurpose;
use App\Models\User;
use App\Models\VerificationCode;
use App\Services\Sms\SmsSender;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\Support\FakeSmsSender;
use Tests\TestCase;

class PhoneSignInTest extends TestCase
{
    use RefreshDatabase;

    private const PHONE = '+962791234567';

    public function test_phone_accounts_sign_in_with_their_number_in_any_format(): void
    {
        User::factory()->withPhone(self::PHONE)->create();

        $this->postJson('/api/auth/login', ['phone' => '+962 79-123 4567', 'password' => 'password'])
            ->assertOk()
            ->assertJsonPath('user.phone', self::PHONE)
            ->assertJsonStructure(['token']);
    }

    public function test_a_wrong_password_names_the_phone_number(): void
    {
        User::factory()->withPhone(self::PHONE)->create();

        $this->postJson('/api/auth/login', ['phone' => self::PHONE, 'password' => 'wrong'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['phone' => "That phone number and password don't match. Check them and try again."]);
    }

    public function test_an_email_or_phone_number_is_required(): void
    {
        $this->postJson('/api/auth/login', ['password' => 'password'])
            ->assertJsonValidationErrors(['email' => 'Enter your email address or phone number.']);
    }

    public function test_phone_accounts_get_reset_codes_by_text_message(): void
    {
        Mail::fake();
        $sms = new FakeSmsSender;
        $this->app->instance(SmsSender::class, $sms);

        User::factory()->withPhone(self::PHONE)->create();

        $this->postJson('/api/auth/password/otp', ['phone' => '+962 79 123 4567'])
            ->assertOk()
            ->assertJsonPath('message', 'If an account exists for this phone number, a verification code has been sent.');

        $this->assertNotNull($sms->lastCodeFor(self::PHONE));
        Mail::assertNothingSent();
    }

    public function test_phone_accounts_can_reset_their_password(): void
    {
        $user = User::factory()->withPhone(self::PHONE)->create();
        VerificationCode::create([
            'purpose' => VerificationPurpose::PasswordReset,
            'identifier' => self::PHONE,
            'code_hash' => Hash::make('123456'),
            'expires_at' => now()->addMinutes(10),
        ]);

        $this->postJson('/api/auth/password/reset', [
            'phone' => self::PHONE,
            'otp' => '123456',
            'password' => 'brand-new-pass',
            'password_confirmation' => 'brand-new-pass',
        ])->assertOk();

        $this->assertTrue(Hash::check('brand-new-pass', $user->fresh()->password));
    }

    public function test_people_can_be_found_by_their_full_phone_number(): void
    {
        $me = User::factory()->create();
        User::factory()->withPhone(self::PHONE)->create(['name' => 'Omar Khalil']);

        $this->actingAs($me)->getJson('/api/users?search='.urlencode('+962 79 123 4567'))
            ->assertOk()
            ->assertJsonPath('users.0.name', 'Omar Khalil')
            ->assertJsonMissingPath('users.0.phone');
    }
}
