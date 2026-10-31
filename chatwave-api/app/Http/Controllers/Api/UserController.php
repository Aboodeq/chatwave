<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PublicUserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class UserController extends Controller
{
    /**
     * Find people to start a conversation with: by part of their name, or by their exact
     * email address. Results never include email addresses.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['required', 'string', 'min:2', 'max:100'],
        ]);

        $term = Str::lower(trim($validated['search']));

        // Escape LIKE wildcards. "!" works as the escape character on SQLite, MySQL and PostgreSQL.
        $pattern = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $term).'%';

        $users = User::query()
            ->whereKeyNot($request->user()->id)
            ->where(function ($query) use ($term, $pattern) {
                $query->whereRaw("LOWER(name) LIKE ? ESCAPE '!'", [$pattern])
                    ->orWhere('email', $term);
            })
            ->orderBy('name')
            ->limit(20)
            ->get();

        return response()->json([
            'users' => PublicUserResource::collection($users),
        ]);
    }
}
