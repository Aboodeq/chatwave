<?php

namespace Tests\Support;

use App\Services\Sms\SmsException;
use App\Services\Sms\SmsSender;

/**
 * Records text messages instead of sending them.
 */
class FakeSmsSender implements SmsSender
{
    /** @var list<array{to: string, message: string}> */
    public array $sent = [];

    public bool $fails = false;

    public function send(string $to, string $message): void
    {
        if ($this->fails) {
            throw new SmsException('Provider unavailable.');
        }

        $this->sent[] = ['to' => $to, 'message' => $message];
    }

    public function deliversMessages(): bool
    {
        return true;
    }

    /**
     * The 6-digit code in the last message sent to this number.
     */
    public function lastCodeFor(string $to): ?string
    {
        foreach (array_reverse($this->sent) as $sms) {
            if ($sms['to'] === $to && preg_match('/\b(\d{6})\b/', $sms['message'], $match)) {
                return $match[1];
            }
        }

        return null;
    }
}
