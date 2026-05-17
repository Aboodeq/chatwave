<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ConversationResource;
use App\Models\Conversation;
use App\Models\User;
use App\Services\ConversationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConversationController extends Controller
{
    public function __construct(protected ConversationService $conversationService) {}

    public function index(Request $request): JsonResponse
    {
        $conversations = $this->conversationService
            ->getConversationsForUser($request->user());

        return response()->json([
            'conversations' => ConversationResource::collection($conversations),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $otherUser = User::findOrFail($request->user_id);

        if ($otherUser->id === $request->user()->id) {
            return response()->json([
                'message' => 'You cannot start a conversation with yourself.',
            ], 422);
        }

        $conversation = $this->conversationService
            ->findOrCreatePrivateConversation($request->user(), $otherUser);

        $conversation->load(['participants', 'group', 'latestMessage.sender']);

        return response()->json([
            'conversation' => new ConversationResource($conversation),
        ], 201);
    }

    public function show(Request $request, Conversation $conversation): JsonResponse
    {
        if (!$this->conversationService->userBelongsToConversation($request->user(), $conversation)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $conversation->load(['participants', 'group', 'latestMessage.sender']);

        return response()->json([
            'conversation' => new ConversationResource($conversation),
        ]);
    }

    public function destroy(Request $request, Conversation $conversation): JsonResponse
    {
        if (!$this->conversationService->userBelongsToConversation($request->user(), $conversation)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $conversation->participants()->detach($request->user()->id);

        return response()->json([
            'message' => 'Left conversation successfully.',
        ]);
    }
}
