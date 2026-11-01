<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PublicUserResource;
use App\Models\Contact;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Blocking. A blocked person can't message you, start a conversation with you, or see
 * when you're online; you can't message them until you unblock them.
 */
class BlockController extends Controller
{
    /**
     * The people you've blocked.
     */
    public function index(Request $request): JsonResponse
    {
        $blocked = User::query()
            ->whereIn('id', Contact::query()
                ->select('contact_id')
                ->where('user_id', $request->user()->id)
                ->where('is_blocked', true))
            ->orderBy('name')
            ->get();

        return response()->json(['users' => PublicUserResource::collection($blocked)]);
    }

    public function store(Request $request, User $user): JsonResponse
    {
        abort_if($user->is($request->user()), 422, __("You can't block yourself."));

        Contact::updateOrCreate(
            ['user_id' => $request->user()->id, 'contact_id' => $user->id],
            ['is_blocked' => true],
        );
        $request->user()->forgetBlocks();

        return response()->json(['message' => __('You blocked :name.', ['name' => $user->name])]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        Contact::query()
            ->where('user_id', $request->user()->id)
            ->where('contact_id', $user->id)
            ->update(['is_blocked' => false]);
        $request->user()->forgetBlocks();

        return response()->json(['message' => __('You unblocked :name.', ['name' => $user->name])]);
    }
}
