<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Profile\UpdatePasswordRequest;
use App\Http\Requests\Profile\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\File;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * The signed-in user's own profile and account settings.
 */
class ProfileController extends Controller
{
    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->update($request->changes());

        return response()->json(['user' => new UserResource($user)]);
    }

    /**
     * Replace the profile photo. Files get random names on the public disk
     * (served from /storage after `php artisan storage:link`). SVG is not accepted.
     */
    public function updateAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => ['required', File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max('2mb')],
        ], [
            'avatar.max' => __('The photo must be 2 MB or smaller.'),
        ]);

        $user = $request->user();
        $previous = $user->avatar;

        $user->update(['avatar' => $request->file('avatar')->store('avatars', 'public')]);
        $this->deleteAvatarFile($previous);

        return response()->json(['user' => new UserResource($user)]);
    }

    public function destroyAvatar(Request $request): JsonResponse
    {
        $user = $request->user();

        $this->deleteAvatarFile($user->avatar);
        $user->update(['avatar' => null]);

        return response()->json(['user' => new UserResource($user)]);
    }

    /**
     * Change the password and sign out every other device (this one stays signed in).
     */
    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        $user->forceFill([
            'password' => $request->validated('password'), // hashed by the model cast
            'remember_token' => Str::random(60),
        ])->save();

        $current = $user->currentAccessToken();
        $signedOut = $user->tokens()
            ->when($current instanceof PersonalAccessToken, fn ($query) => $query->whereKeyNot($current->getKey()))
            ->delete();

        return response()->json([
            'message' => __('Password updated.'),
            'signed_out_sessions' => $signedOut,
        ]);
    }

    private function deleteAvatarFile(?string $path): void
    {
        // Only ever delete files this controller created.
        if ($path && str_starts_with($path, 'avatars/')) {
            Storage::disk('public')->delete($path);
        }
    }
}
