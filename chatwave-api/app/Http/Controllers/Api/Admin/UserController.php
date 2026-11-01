<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\AdminActionResource;
use App\Http\Resources\Admin\AdminUserResource;
use App\Models\AdminAction;
use App\Models\Contact;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Laravel\Sanctum\PersonalAccessToken;

class UserController extends Controller
{
    private const SORTS = ['name', 'created_at', 'last_seen_at', 'messages_count'];

    /**
     * Everyone, searchable by name, email or phone, filterable and sortable.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'search' => ['sometimes', 'nullable', 'string', 'max:100'],
            'status' => ['sometimes', Rule::in(['all', 'active', 'suspended', 'online'])],
            'role' => ['sometimes', 'nullable', Rule::in(['all', ...Role::cachedAll()->keys()->map(fn ($id) => (string) $id)->all()])],
            'method' => ['sometimes', Rule::in(['all', 'email', 'phone'])],
            'sort' => ['sometimes', Rule::in([...self::SORTS, ...array_map(fn ($sort) => "-{$sort}", self::SORTS)])],
            'per_page' => ['sometimes', 'integer', 'min:5', 'max:100'],
        ]);

        $sort = $validated['sort'] ?? '-created_at';
        $column = ltrim($sort, '-');
        $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';

        $users = User::query()
            ->withCount(['messages', 'conversations'])
            ->when(trim((string) ($validated['search'] ?? '')), function ($query, string $search) {
                $term = Str::lower($search);
                $pattern = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $term).'%';
                $digits = preg_replace('/\D+/', '', $search);

                $query->where(function ($query) use ($pattern, $digits) {
                    $query->whereRaw("LOWER(name) LIKE ? ESCAPE '!'", [$pattern])
                        ->orWhereRaw("LOWER(email) LIKE ? ESCAPE '!'", [$pattern])
                        ->when(strlen($digits) >= 3, fn ($query) => $query->orWhere('phone', 'like', "%{$digits}%"));
                });
            })
            ->when(($validated['status'] ?? 'all') === 'active', fn ($query) => $query->whereNull('suspended_at'))
            ->when(($validated['status'] ?? 'all') === 'suspended', fn ($query) => $query->whereNotNull('suspended_at'))
            ->when(($validated['status'] ?? 'all') === 'online', fn ($query) => $query
                ->where('is_online', true)
                ->where('last_seen_at', '>=', now()->subSeconds(User::ONLINE_WINDOW_SECONDS)))
            ->when(($validated['role'] ?? 'all') !== 'all', fn ($query) => $query->where('role_id', (int) $validated['role']))
            ->when(($validated['method'] ?? 'all') === 'email', fn ($query) => $query->whereNotNull('email'))
            ->when(($validated['method'] ?? 'all') === 'phone', fn ($query) => $query->whereNull('email'))
            // People who were never seen sort last, whichever the direction.
            ->when($column === 'last_seen_at', fn ($query) => $query->orderByRaw('last_seen_at IS NULL'))
            ->orderBy($column, $direction)
            ->orderBy('id', $direction)
            ->paginate((int) ($validated['per_page'] ?? 20))
            ->withQueryString();

        return AdminUserResource::collection($users);
    }

    /**
     * One person: profile, activity counts, signed-in devices and the admin actions about them.
     */
    public function show(User $user): JsonResponse
    {
        $user->loadCount(['messages', 'conversations']);

        $devices = $user->tokens()
            ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->orderByDesc('last_used_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (PersonalAccessToken $token) => [
                'id' => $token->id,
                'user_agent' => $token->name === 'auth_token' ? null : $token->name,
                'created_at' => $token->created_at?->toISOString(),
                'last_used_at' => $token->last_used_at?->toISOString(),
            ]);

        return response()->json([
            'user' => new AdminUserResource($user),
            'stats' => [
                'messages' => $user->messages_count,
                'conversations' => $user->conversations_count,
                'blocked_by' => Contact::where('contact_id', $user->id)->where('is_blocked', true)->count(),
                'blocking' => Contact::where('user_id', $user->id)->where('is_blocked', true)->count(),
            ],
            'devices' => $devices,
            'activity' => AdminActionResource::collection(
                AdminAction::with(['admin', 'target'])->where('target_user_id', $user->id)->latest('id')->limit(20)->get()
            ),
            'is_last_admin' => $user->isAdmin() && User::where('role_id', Role::admin()->id)->count() === 1,
        ]);
    }
}
