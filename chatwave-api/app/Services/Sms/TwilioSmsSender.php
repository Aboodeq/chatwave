<?php

namespace App\Services\Sms;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;

/**
 * Sends texts through Twilio's Messages API. Needs TWILIO_SID, TWILIO_AUTH_TOKEN and
 * TWILIO_FROM (a Twilio number or messaging service SID).
 */
class TwilioSmsSender implements SmsSender
{
    public function __construct(
        private readonly string $accountSid,
        private readonly string $authToken,
        private readonly string $from,
    ) {}

    public function send(string $to, string $message): void
    {
        $sender = str_starts_with($this->from, 'MG') ? 'MessagingServiceSid' : 'From';

        try {
            Http::asForm()
                ->withBasicAuth($this->accountSid, $this->authToken)
                ->timeout(10)
                ->post("https://api.twilio.com/2010-04-01/Accounts/{$this->accountSid}/Messages.json", [
                    'To' => $to,
                    $sender => $this->from,
                    'Body' => $message,
                ])
                ->throw();
        } catch (ConnectionException|RequestException $e) {
            throw new SmsException('The text message could not be sent.', previous: $e);
        }
    }

    public function deliversMessages(): bool
    {
        return true;
    }
}
