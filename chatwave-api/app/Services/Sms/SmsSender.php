<?php

namespace App\Services\Sms;

/**
 * Sends text messages. Pick the driver with SMS_DRIVER (see config/services.php).
 */
interface SmsSender
{
    /**
     * @param  string  $to  An E.164 phone number.
     *
     * @throws SmsException when the message couldn't be handed to the provider.
     */
    public function send(string $to, string $message): void;

    /**
     * Whether messages really leave the server. The "log" driver only writes them to the
     * application log, for local development.
     */
    public function deliversMessages(): bool;
}
