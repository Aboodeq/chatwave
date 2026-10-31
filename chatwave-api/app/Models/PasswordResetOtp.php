<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;

class PasswordResetOtp extends Model
{
    use MassPrunable;

    protected $fillable = [
        'email',
        'code_hash',
        'attempts',
        'expires_at',
        'verified_at',
    ];

    protected $hidden = [
        'code_hash',
    ];

    protected $casts = [
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
