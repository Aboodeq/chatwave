<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Conversations\StoreConversationRequest;
use App\Http\Resources\ConversationResource;
use App\Models\Conversation;
use App\Models\User;
use App\Services\ConversationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Access is enforced by ConversationPolicy on the routes (see routes/api.php).
 */
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

    public function store(StoreConversationRequest $request): JsonResponse
    {
        $otherUser = User::findOrFail($request->integer('user_id'));

        $conversation = $this->conversationService
            ->findOrCreatePrivateConversation($request->user(), $otherUser);

        $this->conversationService->loadForUser($conversation, $request->user());

        return response()->json([
            'conversation' => new ConversationResource($conversation),
        ], $conversation->wasRecentlyCreated ? 201 : 200);
    }

    public function show(Request $request, Conversation $conversation): JsonResponse
    {
        $this->conversationService->loadForUser($conversation, $request->user());

        return response()->json([
            'conversation' => new ConversationResource($conversation),
        ]);
    }

    /**
     * Leave a group conversation.
     */
    public function destroy(Request $request, Conversation $conversation): JsonResponse
    {
        $conversation->participants()->detach($request->user()->id);

        return response()->json([
            'message' => 'Left conversation successfully.',
        ]);
    }
}
