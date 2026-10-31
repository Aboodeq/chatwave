<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Serves profile photos without needing `php artisan storage:link`. File names are
 * random and never reused, so browsers may cache them forever.
 */
class AvatarController extends Controller
{
    public function show(string $file): StreamedResponse
    {
        $path = "avatars/{$file}";

        abort_unless(Storage::disk('public')->exists($path), 404);

        return Storage::disk('public')->response($path, null, [
            'Cache-Control' => 'public, max-age=31536000, immutable',
        ]);
    }
}
