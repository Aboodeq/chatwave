<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\AdminUserResource;
use App\Models\AdminAction;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * What admins can do to an account. Every action is recorded in the audit log, and admins
 * can't act on their own account (so nobody locks themselves out by accident).
 */
class ModerationController extends Controller
{
    /**
     * Suspend: sign the person out everywhere and refuse their sign-ins until restored.
     */
    public function suspend(Request $request, User $user): JsonResponse
    {
        $reason = $request->validate([
            'reason' => ['sometimes', 'nullable', 'string', 'max:255'],
        ])['reason'] ?? null;

        $this->ensureNotSelf($request, $user, "You can't suspend your own account.");

        if ($user->isAdmin()) {
            throw ValidationException::withMessages([
                'user' => 'Remove admin access before suspending this person.',
            ]);
        }

        DB::transaction(function () use ($request, $user, $reason) {
            $user->forceFill([
                'suspended_at' => now(),
                'suspension_reason' => $reason,
                'is_online' => false,
            ])->save();

            $user->tokens()->delete();

            AdminAction::record($request->user(), AdminAction::SUSPENDED, $user, array_filter(['reason' => $reason]));
        });

        return response()->json(['user' => new AdminUserResource($user)]);
    }

    public function restore(Request $request, User $user): JsonResponse
    {
        if ($user->isSuspended()) {
            DB::transaction(function () use ($request, $user) {
                $user->forceFill(['suspended_at' => null, 'suspension_reason' => null])->save();

                AdminAction::record($request->user(), AdminAction::RESTORED, $user);
            });
        }

        return response()->json(['user' => new AdminUserResource($user)]);
    }

    public function updateRole(Request $request, User $user): JsonResponse
    {
        $role = UserRole::from($request->validate([
            'role' => ['required', Rule::enum(UserRole::class)],
        ])['role']);

        $this->ensureNotSelf($request, $user, "You can't change your own role.");

        if ($role === UserRole::Admin && $user->isSuspended()) {
            throw ValidationException::withMessages([
                'role' => 'Restore this account before making it an admin.',
            ]);
        }

        if ($user->role !== $role) {
            DB::transaction(function () use ($request, $user, $role) {
                $from = $user->role;
                $user->forceFill(['role' => $role])->save();

                AdminAction::record($request->user(), AdminAction::ROLE_CHANGED, $user, [
                    'from' => $from->value,
                    'to' => $role->value,
                ]);
            });
        }

        return response()->json(['user' => new AdminUserResource($user)]);
    }

    /**
     * Sign the person out of every device (for example after a lost phone).
     */
    public function signOut(Request $request, User $user): JsonResponse
    {
        $this->ensureNotSelf($request, $user, 'Use Settings › Devices to sign out your own devices.');

        DB::transaction(function () use ($request, $user) {
            $count = $user->tokens()->delete();
            $user->forceFill(['is_online' => false])->save();

            AdminAction::record($request->user(), AdminAction::SIGNED_OUT, $user, ['devices' => $count]);
        });

        return response()->json(['user' => new AdminUserResource($user)]);
    }

    private function ensureNotSelf(Request $request, User $user, string $message): void
    {
        if ($request->user()->is($user)) {
            throw ValidationException::withMessages(['user' => $message]);
        }
    }
}
