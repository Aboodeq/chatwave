<?php

namespace Tests\Feature\Auth;

use App\Jobs\SendPasswordResetCode;
use App\Mail\PasswordResetOtpMail;
use App\Models\PasswordResetOtp;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    private function storeCode(string $email = 'person@example.com', string $code = '123456', array $attributes = []): PasswordResetOtp
    {
        return PasswordResetOtp::create([
            'email'      => $email,
            'code_hash'  => Hash::make($code),
            'attempts'   => 0,
            'expires_at' => now()->addMinutes(10),
            ...$attributes,
        ]);
    }

    private function verify(string $otp, string $email = 'person@example.com')
    {
        return $this->postJson('/api/auth/password/otp/verify', ['email' => $email, 'otp' => $otp]);
    }

    private function reset(string $otp, string $password = 'new-password', string $email = 'person@example.com')
    {
        return $this->postJson('/api/auth/password/reset', [
            'email'                 => $email,
            'otp'                   => $otp,
            'password'              => $password,
            'password_confirmation' => $password,
        ]);
    }

    public function test_password_reset_otp_request_stores_code_and_sends_email(): void
    {
        Mail::fake();

        User::factory()->create(['email' => 'person@example.com']);

        $this->postJson('/api/auth/password/otp', ['email' => 'Person@Example.com'])
            ->assertOk()
            ->assertJson(['expires_in' => 600]);

        Mail::assertSent(PasswordResetOtpMail::class, function (PasswordResetOtpMail $mail): bool {
            return $mail->hasTo('person@example.com') && preg_match('/^\d{6}$/', $mail->code) === 1;
        });

        $this->assertDatabaseHas('password_reset_otps', [
            'email'       => 'person@example.com',
            'attempts'    => 0,
            'verified_at' => null,
        ]);
    }

    public function test_unknown_emails_get_the_same_answer_and_no_email(): void
    {
        Mail::fake();

        $this->postJson('/api/auth/password/otp', ['email' => 'nobody@example.com'])
            ->assertOk()
            ->assertJson(['expires_in' => 600]);

        Mail::assertNothingSent();
        $this->assertDatabaseCount('password_reset_otps', 0);
    }

    public function test_codes_are_sent_from_the_queue_not_during_the_request(): void
    {
        Queue::fake();

        $this->postJson('/api/auth/password/otp', ['email' => 'person@example.com'])->assertOk();

        Queue::assertPushed(SendPasswordResetCode::class, fn ($job) => $job->email === 'person@example.com');
    }

    public function test_a_new_code_can_be_requested_once_a_minute(): void
    {
        Queue::fake();

        $this->postJson('/api/auth/password/otp', ['email' => 'person@example.com'])->assertOk();

        $this->postJson('/api/auth/password/otp', ['email' => 'person@example.com'])
            ->assertStatus(429)
            ->assertHeader('Retry-After')
            ->assertJsonStructure(['message', 'retry_after']);

        $this->travel(61)->seconds();

        $this->postJson('/api/auth/password/otp', ['email' => 'person@example.com'])->assertOk();
    }

    public function test_password_can_be_reset_with_valid_otp(): void
    {
        Event::fake([PasswordReset::class]);

        $user = User::factory()->create([
            'email'    => 'person@example.com',
            'password' => Hash::make('old-password'),
        ]);
        $token = $user->createToken('auth_token')->plainTextToken;
        $this->storeCode();

        $this->reset('123456')->assertOk();

        $this->assertTrue(Hash::check('new-password', $user->fresh()->password));
        $this->assertDatabaseMissing('password_reset_otps', ['email' => 'person@example.com']);
        Event::assertDispatched(PasswordReset::class);

        // Every existing session is signed out.
        $this->withToken($token)->getJson('/api/auth/me')->assertUnauthorized();
    }

    public function test_a_code_works_only_once(): void
    {
        User::factory()->create(['email' => 'person@example.com']);
        $this->storeCode();

        $this->reset('123456')->assertOk();

        $this->reset('123456', 'another-password')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['otp']);
    }

    public function test_verifying_the_right_code_does_not_use_up_an_attempt(): void
    {
        User::factory()->create(['email' => 'person@example.com']);
        $otp = $this->storeCode(attributes: ['attempts' => 4]);

        $this->verify('123456')->assertOk();

        $otp->refresh();
        $this->assertSame(4, $otp->attempts);
        $this->assertNotNull($otp->verified_at);

        // ...so the reset that follows still has an attempt left.
        $this->reset('123456')->assertOk();
    }

    public function test_a_code_is_locked_after_five_wrong_guesses(): void
    {
        User::factory()->create(['email' => 'person@example.com']);
        $this->storeCode();

        foreach (['000001', '000002', '000003', '000004', '000005'] as $guess) {
            $this->verify($guess)->assertJsonValidationErrors(['otp' => 'The verification code is invalid or expired.']);
        }

        $this->verify('123456')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['otp' => 'Too many attempts. Please request a new code.']);
    }

    public function test_expired_codes_are_rejected_and_removed(): void
    {
        User::factory()->create(['email' => 'person@example.com']);
        $this->storeCode(attributes: ['expires_at' => now()->subMinute()]);

        $this->verify('123456')->assertJsonValidationErrors(['otp']);

        $this->assertDatabaseCount('password_reset_otps', 0);
    }

    public function test_guesses_are_capped_per_email_even_across_new_codes(): void
    {
        User::factory()->create(['email' => 'person@example.com']);

        // Requesting a new code resets the per-code counter, so a separate per-address
        // limit has to stop attackers from cycling codes.
        for ($round = 0; $round < 2; $round++) {
            PasswordResetOtp::query()->delete();
            $this->storeCode();

            for ($i = 0; $i < 5; $i++) {
                $this->verify('999999')->assertUnprocessable();
            }
        }

        PasswordResetOtp::query()->delete();
        $this->storeCode();

        $this->verify('123456')->assertStatus(429);
    }

    public function test_expired_codes_are_pruned(): void
    {
        $this->storeCode('old@example.com', attributes: ['expires_at' => now()->subDays(2)]);
        $this->storeCode('fresh@example.com');

        $this->artisan('model:prune', ['--model' => [PasswordResetOtp::class]])->assertSuccessful();

        $this->assertDatabaseMissing('password_reset_otps', ['email' => 'old@example.com']);
        $this->assertDatabaseHas('password_reset_otps', ['email' => 'fresh@example.com']);
    }
}
