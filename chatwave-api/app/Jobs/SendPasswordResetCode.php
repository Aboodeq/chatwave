<?php

namespace App\Jobs;

use App\Services\PasswordResetOtpService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Generates and emails a reset code off the request cycle. The HTTP response then takes the
 * same time whether or not the email belongs to an account, and the plain code never
 * touches the queue payload (it is created inside the worker).
 */
class SendPasswordResetCode implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function __construct(public string $email)
    {
        //
    }

    public function handle(PasswordResetOtpService $otps): void
    {
        $otps->send($this->email);
    }
}
