<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\Permission;
use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\RoleResource;
use App\Models\AdminAction;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Roles and what they allow. Rules that keep this from being a way to gain access:
 * the Admin role always has everything and can't be changed; nobody can change the role
 * they're in, or grant permissions they don't have themselves; deleting a role moves its
 * people to Member.
 */
class RoleController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'roles' => RoleResource::collection(Role::withCount('users')->orderBy('id')->get()),
            'permissions' => Permission::values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $this->ensureCanGrant($request->user(), $data['permissions']);

        $role = DB::transaction(function () use ($request, $data) {
            $role = Role::create($data);

            AdminAction::record($request->user(), AdminAction::ROLE_CREATED, details: ['role' => $role->name]);

            return $role;
        });

        Role::forgetCache();

        return response()->json(['role' => new RoleResource($role->loadCount('users'))], 201);
    }

    public function update(Request $request, Role $role): JsonResponse
    {
        $editor = $request->user();

        if ($role->isAdmin()) {
            throw ValidationException::withMessages(['role' => __('The Admin role always has every permission and can\'t be changed.')]);
        }

        if (! $editor->isAdmin() && $editor->role_id === $role->id) {
            throw ValidationException::withMessages(['role' => __("You can't change the role you're in. Ask an admin.")]);
        }

        $data = $this->validated($request, $role);

        if ($role->isBuiltIn()) {
            unset($data['name']); // built-in roles keep their names (the app translates them)
        }

        $this->ensureCanGrant($editor, $data['permissions']);

        DB::transaction(function () use ($editor, $role, $data) {
            $before = $role->grantedPermissions();
            $role->update($data);

            AdminAction::record($editor, AdminAction::ROLE_UPDATED, details: array_filter([
                'role' => $role->name,
                'added' => array_values(array_diff($role->grantedPermissions(), $before)),
                'removed' => array_values(array_diff($before, $role->grantedPermissions())),
            ]));
        });

        Role::forgetCache();

        return response()->json(['role' => new RoleResource($role->loadCount('users'))]);
    }

    public function destroy(Request $request, Role $role): JsonResponse
    {
        if ($role->isBuiltIn()) {
            throw ValidationException::withMessages(['role' => __("Built-in roles can't be deleted.")]);
        }

        $this->ensureCanGrant($request->user(), $role->grantedPermissions());

        $moved = DB::transaction(function () use ($request, $role) {
            $moved = User::where('role_id', $role->id)->update(['role_id' => Role::member()->id]);
            $role->delete();

            AdminAction::record($request->user(), AdminAction::ROLE_DELETED, details: ['role' => $role->name, 'moved' => $moved]);

            return $moved;
        });

        Role::forgetCache();

        return response()->json(['moved_to_member' => $moved]);
    }

    /**
     * @return array{name: string, description: string|null, permissions: list<string>}
     */
    private function validated(Request $request, ?Role $role = null): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:50', Rule::unique(Role::class, 'name')->ignore($role?->id)],
            'description' => ['nullable', 'string', 'max:255'],
            'permissions' => ['present', 'array'],
            'permissions.*' => ['string', Rule::in(Permission::values())],
        ], [
            'name.unique' => __('A role with this name already exists.'),
        ]);

        // Stored in catalogue order, without duplicates.
        $data['permissions'] = array_values(array_intersect(Permission::values(), $data['permissions']));

        return $data;
    }

    /**
     * Nobody can hand out access they don't have themselves (admins have everything).
     *
     * @param  list<string>  $permissions
     */
    private function ensureCanGrant(User $editor, array $permissions): void
    {
        $missing = array_diff($permissions, $editor->permissionValues());

        if ($missing !== []) {
            throw ValidationException::withMessages([
                'permissions' => __("You can't give a role permissions you don't have yourself."),
            ]);
        }
    }
}
