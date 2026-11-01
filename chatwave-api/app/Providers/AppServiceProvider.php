<?php

namespace App\Providers;

use App\Enums\Permission;
use App\Models\User;
use App\Services\Sms\LogSmsSender;
use App\Services\Sms\SmsSender;
use App\Services\Sms\TwilioSmsSender;
use App\Support\Phone;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Text messages: "log" writes them to the application log (development), "twilio"
        // sends them. See config/services.php.
        $this->app->singleton(SmsSender::class, fn () => match (config('services.sms.driver')) {
            'twilio' => new TwilioSmsSender(
                (string) config('services.twilio.sid'),
                (string) config('services.twilio.token'),
                (string) config('services.twilio.from'),
            ),
            default => new LogSmsSender,
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Catch N+1 queries during development instead of discovering them in production.
        Model::preventLazyLoading(! $this->app->isProduction());

        // bcrypt ignores everything after 72 bytes, so don't accept longer passwords.
        Password::defaults(fn () => Password::min(8)->max(72));

        // Role-based access: every permission is a gate ("can:admin.people"), and "admin"
        // opens the dashboard for anyone with at least one administrative permission.
        // Suspended accounts never get this far.
        foreach (Permission::cases() as $permission) {
            Gate::define($permission->value, fn (User $user) => $user->hasPermission($permission));
        }
        Gate::define('admin', fn (User $user) => $user->canAccessAdmin());

        $this->configureRateLimiting();
    }

    protected function configureRateLimiting(): void
    {
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by($request->user()?->id ?: $request->ip());
        });

        // Coarse per-IP limit for sign-in and sign-up. LoginRequest adds a per-account limit.
        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute(20)->by($request->ip());
        });

        // Sending a code (password reset, or phone sign-up): per IP, plus a one-minute
        // cooldown and caps per email or phone number, shared by both endpoints so nobody
        // can flood someone's inbox or phone.
        RateLimiter::for('code-send', function (Request $request) {
            $contact = $this->contactKey($request);

            return [
                Limit::perMinute(5)->by('ip:'.$request->ip()),
                Limit::perMinute(1)->by('cooldown:'.$contact),
                Limit::perHour(5)->by('hourly:'.$contact),
                Limit::perDay(10)->by('daily:'.$contact),
            ];
        });

        // Checking a reset code: per IP, plus caps per address that survive requesting new
        // codes. Each code also allows only 5 wrong guesses (VerificationCodeService), so a
        // 6-digit code can be guessed at most ~30 times a day per account, whatever the IP.
        RateLimiter::for('code-check', function (Request $request) {
            $contact = $this->contactKey($request);

            return [
                Limit::perMinute(10)->by('ip:'.$request->ip()),
                Limit::perHour(10)->by('hourly:'.$contact),
                Limit::perDay(30)->by('daily:'.$contact),
            ];
        });
    }

    /**
     * The email address or phone number a request is about, normalized like the form
     * requests do (rate limiters run before them).
     */
    private function contactKey(Request $request): string
    {
        $email = $request->input('email');

        $contact = is_string($email) && trim($email) !== ''
            ? Str::lower(trim($email))
            : Phone::normalize((string) $request->input('phone'));

        return sha1($contact);
    }
}
