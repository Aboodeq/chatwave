<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\Sms\SmsSender;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\Support\FakeSmsSender;
use Tests\TestCase;

class LocalizationTest extends TestCase
{
    use RefreshDatabase;

    private function login(string $language)
    {
        return $this->withHeader('Accept-Language', $language)
            ->postJson('/api/auth/login', ['email' => 'person@example.com', 'password' => 'wrong']);
    }

    public function test_messages_follow_the_language_the_app_asks_for(): void
    {
        User::factory()->create(['email' => 'person@example.com']);

        $this->login('en')
            ->assertJsonValidationErrors(['email' => "That email and password don't match. Check them and try again."])
            ->assertHeader('Content-Language', 'en');

        $this->login('ar')
            ->assertJsonValidationErrors(['email' => 'البريد الإلكتروني وكلمة المرور غير متطابقين. تحقّق منهما وحاول مجددًا.'])
            ->assertHeader('Content-Language', 'ar');

        // Regional variants and unsupported languages fall back sensibly.
        $this->login('ar-JO,ar;q=0.9,en;q=0.8')->assertHeader('Content-Language', 'ar');
        $this->login('fr-FR')->assertHeader('Content-Language', 'en');
    }

    public function test_built_in_validation_messages_are_translated(): void
    {
        $this->actingAs(User::factory()->admin()->create())
            ->withHeader('Accept-Language', 'ar')
            ->getJson('/api/admin/overview?timezone=Mars/Olympus')
            ->assertJsonValidationErrors(['timezone' => 'يجب أن يكون المنطقة الزمنية منطقة زمنية صحيحة.']);
    }

    public function test_framework_errors_are_translated(): void
    {
        $this->withHeader('Accept-Language', 'ar')
            ->getJson('/api/auth/me')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'يجب تسجيل الدخول.');
    }

    public function test_reset_codes_are_texted_in_the_requested_language(): void
    {
        Mail::fake();
        $sms = new FakeSmsSender;
        $this->app->instance(SmsSender::class, $sms);
        User::factory()->withPhone('+962791234567')->create();

        $this->withHeader('Accept-Language', 'ar')
            ->postJson('/api/auth/password/otp', ['phone' => '+962791234567'])
            ->assertOk()
            ->assertJsonPath('message', 'إذا كان هناك حساب بهذا الرقم، فقد أُرسل إليه رمز تحقق.');

        $this->assertStringContainsString('هو رمز إعادة تعيين كلمة المرور في ChatWave', $sms->sent[0]['message']);
    }

    public function test_accounts_remember_their_language(): void
    {
        $token = $this->withHeader('Accept-Language', 'ar')->postJson('/api/auth/register', [
            'name' => 'سارة',
            'email' => 'sara@example.com',
            'password' => 'secret-pass-1',
            'password_confirmation' => 'secret-pass-1',
        ])->assertCreated()
            ->assertJsonPath('user.locale', 'ar')
            ->assertJsonPath('user.status_text', 'مرحبًا! أنا أستخدم ChatWave.')
            ->json('token');

        $this->withToken($token)->patchJson('/api/profile', ['locale' => 'en'])->assertOk()->assertJsonPath('user.locale', 'en');
        $this->withToken($token)->patchJson('/api/profile', ['locale' => 'fr'])->assertJsonValidationErrors(['locale']);
    }
}
