<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\Sms\SmsSender;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Configuration and health at a glance, including the production checklist from the
 * audit. Never returns secrets: only drivers, counts and yes/no checks.
 */
class SystemController extends Controller
{
    public function __invoke(SmsSender $sms): JsonResponse
    {
        $production = app()->isProduction();
        $debug = (bool) config('app.debug');
        $origins = (array) config('cors.allowed_origins');
        $mailer = (string) config('mail.default');
        $smsDriver = (string) config('services.sms.driver');
        $queue = (string) config('queue.default');
        [$pending, $stalled] = $this->pendingJobs($queue);
        $failed = $this->failedJobs();
        $https = str_starts_with((string) config('app.url'), 'https://');

        $checks = [
            $this->check(
                'debug',
                ! $debug ? 'ok' : ($production ? 'problem' : 'info'),
                $debug ? __('Debug mode is on') : __('Debug mode is off'),
                $debug ? __('Error pages show internal details. Set APP_DEBUG=false in production.') : __('Errors are hidden from visitors.'),
            ),
            $this->check(
                'cors',
                in_array('*', $origins, true) ? ($production ? 'problem' : 'info') : 'ok',
                in_array('*', $origins, true) ? __('Any website can call the API') : __('API calls are limited to your sites'),
                in_array('*', $origins, true) ? __("Set CORS_ALLOWED_ORIGINS to the client's address.") : implode(', ', $origins),
            ),
            $this->check(
                'mail',
                in_array($mailer, ['log', 'array'], true) ? 'warning' : 'ok',
                in_array($mailer, ['log', 'array'], true) ? __('Emails are not sent') : __('Emails are sent'),
                in_array($mailer, ['log', 'array'], true)
                    ? __('Password reset emails are written to the log. Configure MAIL_MAILER to send them.')
                    : __('Using the :mailer mailer.', ['mailer' => $mailer]),
            ),
            $this->check(
                'sms',
                $sms->deliversMessages() ? 'ok' : 'warning',
                $sms->deliversMessages() ? __('Text messages are sent') : __('Text messages are not sent'),
                $sms->deliversMessages()
                    ? __('Using :driver.', ['driver' => $smsDriver])
                    : __('Phone sign-up codes are written to the log. Set SMS_DRIVER=twilio to send them.'),
            ),
            $this->check(
                'queue',
                $failed > 0 || $stalled ? 'warning' : 'ok',
                match (true) {
                    $stalled => __('Jobs are waiting to run'),
                    $failed > 0 => trans_choice('{1} :count background job has failed|[2,*] :count background jobs have failed', $failed),
                    default => __('Background jobs are running'),
                },
                match (true) {
                    $stalled => __('Some jobs have waited over 5 minutes. Is `php artisan queue:work` running?'),
                    $failed > 0 => __('See `php artisan queue:failed`, then retry or forget them.'),
                    default => $queue === 'sync' ? __('Jobs run during the request (sync queue).') : __('No stuck or failed jobs.'),
                },
            ),
            $this->check(
                'https',
                $https ? 'ok' : ($production ? 'problem' : 'info'),
                $https ? __('Served over HTTPS') : __('Not served over HTTPS'),
                $https ? (string) config('app.url') : __('Set APP_URL to an https:// address in production.'),
            ),
        ];

        return response()->json([
            'app' => [
                'environment' => app()->environment(),
                'debug' => $debug,
                'laravel' => app()->version(),
                'php' => PHP_VERSION,
                'timezone' => (string) config('app.timezone'),
            ],
            'services' => [
                'database' => DB::connection()->getDriverName(),
                'database_size' => $this->databaseSize(),
                'queue' => $queue,
                'pending_jobs' => $pending,
                'failed_jobs' => $failed,
                'mail' => $mailer,
                'sms' => $smsDriver,
            ],
            'storage' => $this->avatarStorage(),
            'checks' => $checks,
        ]);
    }

    /**
     * @return array{key: string, status: string, title: string, detail: string}
     */
    private function check(string $key, string $status, string $title, string $detail): array
    {
        return compact('key', 'status', 'title', 'detail');
    }

    /**
     * @return array{0: int|null, 1: bool} pending jobs, and whether any waited over 5 minutes
     */
    private function pendingJobs(string $queue): array
    {
        if (config("queue.connections.{$queue}.driver") !== 'database' || ! Schema::hasTable('jobs')) {
            return [null, false];
        }

        $table = DB::table((string) config("queue.connections.{$queue}.table", 'jobs'));

        return [
            $table->count(),
            (clone $table)->whereNull('reserved_at')->where('available_at', '<', now()->subMinutes(5)->getTimestamp())->exists(),
        ];
    }

    private function failedJobs(): int
    {
        return Schema::hasTable('failed_jobs') ? DB::table('failed_jobs')->count() : 0;
    }

    private function databaseSize(): ?int
    {
        if (DB::connection()->getDriverName() !== 'sqlite') {
            return null;
        }

        $path = (string) config('database.connections.sqlite.database');

        return is_file($path) ? (int) filesize($path) : null;
    }

    /**
     * @return array{avatars: int, avatar_bytes: int}
     */
    private function avatarStorage(): array
    {
        try {
            $files = Storage::disk('public')->files('avatars');
        } catch (Throwable) {
            $files = [];
        }

        return [
            'avatars' => count($files),
            'avatar_bytes' => array_sum(array_map(fn (string $file) => Storage::disk('public')->size($file), $files)),
        ];
    }
}
