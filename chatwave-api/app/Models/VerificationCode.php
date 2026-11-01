<?php

namespace App\Models;

use App\Enums\VerificationPurpose;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;

/**
 * A hashed one-time code sent by email or text message. See VerificationCodeService.
 */
class VerificationCode extends Model
{
    use MassPrunable;

    protected $fillable = [
        'purpose',
        'identifier',
        'code_hash',
        'attempts',
        'expires_at',
        'verified_at',
    ];

    protected $hidden = [
        'code_hash',
    ];

    protected $casts = [
        'purpose' => VerificationPurpose::class,
        'attempts' => 'integer',
        'expires_at' => 'datetime',
        'verified_at' => 'datetime',
    ];

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    /**
     * Expired codes are deleted by `php artisan model:prune` (scheduled daily).
     */
    public function prunable(): Builder
    {
        return static::where('expires_at', '<', now()->subDay());
    }
}
