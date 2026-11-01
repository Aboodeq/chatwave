<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordResetOtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $code, public int $expiresInMinutes = 10)
    {
        //
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: __('Your ChatWave password reset code'),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.password-reset-otp',
            text: 'emails.password-reset-otp-text',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
