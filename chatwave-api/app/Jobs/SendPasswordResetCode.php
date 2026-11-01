<?php

namespace App\Jobs;

use App\Services\PasswordResetService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Generates and sends a reset code off the request cycle. The HTTP response then takes the
 * same time whether or not the email or phone number belongs to an account, and the plain
 * code never touches the queue payload (it is created inside the worker).
 */
class SendPasswordResetCode implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /**
     * @param  string  $identifier  A normalized email address or E.164 phone number.
     */
    public function __construct(public string $identifier)
    {
        //
    }

    public function handle(PasswordResetService $passwordResets): void
    {
        $passwordResets->send($this->identifier);
    }
}
