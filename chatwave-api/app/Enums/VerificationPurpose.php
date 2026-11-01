<?php

namespace App\Enums;

/**
 * What a one-time code is for. Codes for different purposes never unlock each other.
 */
enum VerificationPurpose: string
{
    case PasswordReset = 'password_reset';
    case Registration = 'registration';
}
