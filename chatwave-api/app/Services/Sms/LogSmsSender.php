<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\Log;

/**
 * Development driver: writes each text to the application log
 * (storage/logs/laravel.log) instead of sending it.
 */
class LogSmsSender implements SmsSender
{
    public function send(string $to, string $message): void
    {
        Log::info("SMS to {$to}: {$message}");
    }

    public function deliversMessages(): bool
    {
        return false;
    }
}
