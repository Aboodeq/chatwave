<?php

namespace App\Support;

/**
 * Phone numbers are stored in E.164 form: a plus sign, the country code and the number,
 * with no spaces (+962791234567). The client formats and checks numbers per country; the
 * API accepts anything that normalizes to that shape, and confirms ownership by text.
 */
final class Phone
{
    /** A plus sign and 7 to 15 digits, the first of which isn't 0. */
    public const PATTERN = '/^\+[1-9]\d{6,14}$/';

    /**
     * Remove spaces, dashes, dots and brackets, and turn a leading "00" into "+".
     */
    public static function normalize(string $value): string
    {
        $compact = (string) preg_replace('/[\s\-.()\x{00A0}]+/u', '', trim($value));

        return str_starts_with($compact, '00') ? '+'.substr($compact, 2) : $compact;
    }

    public static function isValid(string $value): bool
    {
        return preg_match(self::PATTERN, $value) === 1;
    }

    /**
     * For messages that shouldn't show the whole number: "+962 ••• ••• 567".
     */
    public static function mask(string $phone): string
    {
        return substr($phone, 0, 4).' ••• ••• '.substr($phone, -3);
    }
}
