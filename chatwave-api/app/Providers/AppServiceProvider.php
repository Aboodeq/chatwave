<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
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
        //
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

        // Sending a reset code: per IP, plus a one-minute cooldown and caps per address.
        RateLimiter::for('password-otp-send', function (Request $request) {
            $email = $this->emailKey($request);

            return [
                Limit::perMinute(5)->by('ip:'.$request->ip()),
                Limit::perMinute(1)->by('cooldown:'.$email),
                Limit::perHour(5)->by('hourly:'.$email),
                Limit::perDay(10)->by('daily:'.$email),
            ];
        });

        // Checking a reset code: per IP, plus caps per address that survive requesting new
        // codes. Each code also allows only 5 wrong guesses (PasswordResetOtpService), so a
        // 6-digit code can be guessed at most ~30 times a day per account, whatever the IP.
        RateLimiter::for('password-otp-check', function (Request $request) {
            $email = $this->emailKey($request);

            return [
                Limit::perMinute(10)->by('ip:'.$request->ip()),
                Limit::perHour(10)->by('hourly:'.$email),
                Limit::perDay(30)->by('daily:'.$email),
            ];
        });
    }

    private function emailKey(Request $request): string
    {
        return sha1(Str::lower(trim((string) $request->input('email'))));
    }
}
