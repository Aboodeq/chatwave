<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\AdminUserResource;
use App\Models\AdminAction;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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

        $this->ensureNotSelf($request, $user, __("You can't suspend your own account."));

        if ($user->isAdmin()) {
            throw ValidationException::withMessages([
                'user' => __('Give this person another role before suspending them.'),
            ]);
        }

        $this->ensureOutranks($request->user(), $user);

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

    /**
     * Give someone a role. Only admins can give or take away the Admin role, nobody can
     * change their own role, and nobody can hand out a role with more access than they have.
     */
    public function updateRole(Request $request, User $user): JsonResponse
    {
        $role = Role::findOrFail($request->validate([
            'role_id' => ['required', 'integer'],
        ])['role_id']);
        $editor = $request->user();

        $this->ensureNotSelf($request, $user, __("You can't change your own role."));

        if (($role->isAdmin() || $user->isAdmin()) && ! $editor->isAdmin()) {
            throw ValidationException::withMessages(['role_id' => __('Only admins can give or take away the Admin role.')]);
        }

        if ($role->isAdmin() && $user->isSuspended()) {
            throw ValidationException::withMessages(['role_id' => __('Restore this account before making it an admin.')]);
        }

        if (array_diff($role->grantedPermissions(), $editor->permissionValues()) !== []) {
            throw ValidationException::withMessages(['role_id' => __("You can't give someone more access than you have.")]);
        }

        $this->ensureOutranks($editor, $user);

        if ($user->role_id !== $role->id) {
            DB::transaction(function () use ($editor, $user, $role) {
                $from = $user->currentRole()->name;
                $user->forceFill(['role_id' => $role->id])->save();

                AdminAction::record($editor, AdminAction::ROLE_CHANGED, $user, ['from' => $from, 'to' => $role->name]);
            });
        }

        return response()->json(['user' => new AdminUserResource($user->fresh())]);
    }

    /**
     * Sign the person out of every device (for example after a lost phone).
     */
    public function signOut(Request $request, User $user): JsonResponse
    {
        $this->ensureNotSelf($request, $user, __('Use Settings › Devices to sign out your own devices.'));
        $this->ensureOutranks($request->user(), $user);

        DB::transaction(function () use ($request, $user) {
            $count = $user->tokens()->delete();
            $user->forceFill(['is_online' => false])->save();

            AdminAction::record($request->user(), AdminAction::SIGNED_OUT, $user, ['devices' => $count]);
        });

        return response()->json(['user' => new AdminUserResource($user)]);
    }

    /**
     * Only admins can act on people who have admin access themselves.
     */
    private function ensureOutranks(User $editor, User $user): void
    {
        if (! $editor->isAdmin() && $user->canAccessAdmin()) {
            throw ValidationException::withMessages(['user' => __('Only admins can do this to people who have admin access.')]);
        }
    }

    private function ensureNotSelf(Request $request, User $user, string $message): void
    {
        if ($request->user()->is($user)) {
            throw ValidationException::withMessages(['user' => $message]);
        }
    }
}
