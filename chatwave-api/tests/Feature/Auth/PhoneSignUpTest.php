<?php

namespace Tests\Feature\Auth;

use App\Enums\VerificationPurpose;
use App\Models\User;
use App\Models\VerificationCode;
use App\Services\Sms\SmsSender;
use App\Services\VerificationCodeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Queue;
use Tests\Support\FakeSmsSender;
use Tests\TestCase;

class PhoneSignUpTest extends TestCase
{
    use RefreshDatabase;

    private const PHONE = '+962791234567';

    private FakeSmsSender $sms;

    protected function setUp(): void
    {
        parent::setUp();

        $this->sms = new FakeSmsSender;
        $this->app->instance(SmsSender::class, $this->sms);
    }

    private function requestCode(string $phone = '+962 79 123-4567')
    {
        return $this->postJson('/api/auth/register/code', ['phone' => $phone]);
    }

    private function register(array $overrides = [])
    {
        return $this->postJson('/api/auth/register', [
            'name' => 'Omar Khalil',
            'phone' => self::PHONE,
            'otp' => $this->sms->lastCodeFor(self::PHONE),
            'password' => 'secret-pass-1',
            'password_confirmation' => 'secret-pass-1',
            ...$overrides,
        ]);
    }

    public function test_a_code_is_texted_to_the_number(): void
    {
        $this->requestCode()
            ->assertOk()
            ->assertJson(['expires_in' => 600])
            ->assertJsonMissingPath('dev_code');

        $this->assertCount(1, $this->sms->sent);
        $this->assertSame(self::PHONE, $this->sms->sent[0]['to']);
        $this->assertMatchesRegularExpression('/^\d{6} is your ChatWave verification code/', $this->sms->sent[0]['message']);
        $this->assertDatabaseHas('verification_codes', ['purpose' => 'registration', 'identifier' => self::PHONE]);
    }

    public function test_numbers_are_normalized_from_common_formats(): void
    {
        $this->requestCode('00962 (79) 123.4567')->assertOk();

        $this->assertSame(self::PHONE, $this->sms->sent[0]['to']);
    }

    public function test_local_development_without_a_real_sms_driver_returns_the_code(): void
    {
        $this->app->forgetInstance(SmsSender::class);
        $this->app->detectEnvironment(fn () => 'local');
        config(['services.sms.driver' => 'log']);

        $code = $this->requestCode()->assertOk()->json('dev_code');

        $this->assertMatchesRegularExpression('/^\d{6}$/', $code);
    }

    public function test_invalid_and_taken_numbers_are_refused(): void
    {
        $this->requestCode('12345')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['phone' => 'Enter a valid phone number, including the country code.']);

        User::factory()->withPhone(self::PHONE)->create();

        $this->requestCode()
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['phone' => 'This phone number is already registered. Sign in instead.']);

        $this->assertSame([], $this->sms->sent);
    }

    public function test_signing_up_with_the_texted_code(): void
    {
        $this->requestCode()->assertOk();

        $response = $this->register()
            ->assertCreated()
            ->assertJsonPath('user.phone', self::PHONE)
            ->assertJsonPath('user.email', null)
            ->assertJsonStructure(['token', 'expires_at']);

        $user = User::firstWhere('phone', self::PHONE);
        $this->assertNotNull($user->phone_verified_at);
        $this->assertTrue(Hash::check('secret-pass-1', $user->password));
        $this->assertDatabaseCount('verification_codes', 0);

        $this->withToken($response->json('token'))->getJson('/api/auth/me')->assertOk();
    }

    public function test_a_wrong_or_missing_code_creates_no_account(): void
    {
        $this->requestCode()->assertOk();

        $this->register(['otp' => '000000'])->assertJsonValidationErrors(['otp' => 'The verification code is invalid or expired.']);
        $this->register(['otp' => null])->assertJsonValidationErrors(['otp' => 'Enter the 6-digit code we texted you.']);

        $this->assertDatabaseMissing('users', ['phone' => self::PHONE]);
    }

    public function test_a_code_can_only_be_used_once(): void
    {
        $this->requestCode()->assertOk();
        $code = $this->sms->lastCodeFor(self::PHONE);

        $this->register()->assertCreated();
        User::where('phone', self::PHONE)->delete();

        $this->register(['otp' => $code])->assertJsonValidationErrors(['otp']);
    }

    public function test_codes_for_one_purpose_do_not_work_for_another(): void
    {
        VerificationCode::create([
            'purpose' => VerificationPurpose::PasswordReset,
            'identifier' => self::PHONE,
            'code_hash' => Hash::make('123456'),
            'expires_at' => now()->addMinutes(10),
        ]);

        $this->register(['otp' => '123456'])->assertJsonValidationErrors(['otp']);
    }

    public function test_an_email_and_a_phone_number_together_are_refused(): void
    {
        $this->register(['email' => 'omar@example.com'])
            ->assertJsonValidationErrors(['email' => 'Use an email address or a phone number, not both.']);
    }

    public function test_the_first_account_administers_the_system(): void
    {
        $this->requestCode()->assertOk();
        $this->register()->assertCreated()->assertJsonPath('user.role.key', 'admin');

        $this->postJson('/api/auth/register', [
            'name' => 'Second Person',
            'email' => 'second@example.com',
            'password' => 'secret-pass-1',
            'password_confirmation' => 'secret-pass-1',
        ])->assertCreated()->assertJsonPath('user.role.key', 'member');

        $this->assertTrue(User::firstWhere('phone', self::PHONE)->isAdmin());
    }

    public function test_a_failed_text_message_is_reported_and_leaves_no_code(): void
    {
        $this->sms->fails = true;

        $this->requestCode()
            ->assertStatus(503)
            ->assertJsonPath('message', "We couldn't send a text message right now. Please try again in a few minutes.");

        $this->assertDatabaseCount('verification_codes', 0);
    }

    public function test_codes_are_rate_limited_per_number_across_sign_up_and_password_reset(): void
    {
        Queue::fake();

        $this->requestCode()->assertOk();

        $this->postJson('/api/auth/password/otp', ['phone' => self::PHONE])->assertStatus(429);

        $this->travel(61)->seconds();

        $this->postJson('/api/auth/password/otp', ['phone' => self::PHONE])->assertOk();
    }

    public function test_codes_expire(): void
    {
        $this->requestCode()->assertOk();

        $this->travel(VerificationCodeService::TTL_MINUTES + 1)->minutes();

        $this->register()->assertJsonValidationErrors(['otp']);
    }
}
