<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Messages\StoreMessageRequest;
use App\Http\Requests\Messages\UpdateMessageRequest;
use App\Http\Resources\MessageResource;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\ConversationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Access is enforced by ConversationPolicy and MessagePolicy on the routes (see routes/api.php).
 */
class MessageController extends Controller
{
    public function __construct(protected ConversationService $conversationService) {}

    public function index(Request $request, Conversation $conversation): JsonResponse
    {
        // Paginate on the unique, ever-increasing id. Paginating on created_at alone
        // skipped messages that shared a timestamp (common: second-level precision).
        $messages = $conversation->messages()
            ->with(Message::RESOURCE_RELATIONS)
            ->orderByDesc('id')
            ->cursorPaginate(30);

        return response()->json([
            'messages'    => MessageResource::collection($messages->items()),
            'next_cursor' => $messages->nextCursor()?->encode(),
        ]);
    }

    public function store(StoreMessageRequest $request, Conversation $conversation): JsonResponse
    {
        $message = DB::transaction(function () use ($request, $conversation) {
            $message = $conversation->messages()->create([
                'sender_id'   => $request->user()->id,
                'type'        => 'text',
                'body'        => $request->validated('body'),
                'reply_to_id' => $request->validated('reply_to_id'),
            ]);

            // Keeps the conversation list sorted by latest activity.
            $conversation->touch();

            return $message;
        });

        $message->load(Message::RESOURCE_RELATIONS);

        return response()->json([
            'message' => new MessageResource($message),
        ], 201);
    }

    public function update(UpdateMessageRequest $request, Message $message): JsonResponse
    {
        $message->update([
            'body'      => $request->validated('body'),
            'is_edited' => true,
            'edited_at' => now(),
        ]);

        $message->load(Message::RESOURCE_RELATIONS);

        return response()->json([
            'message' => new MessageResource($message),
        ]);
    }

    public function destroy(Message $message): JsonResponse
    {
        $message->delete();

        return response()->json([
            'message' => 'Message deleted successfully.',
        ]);
    }

    public function markAsRead(Request $request, Conversation $conversation): JsonResponse
    {
        $this->conversationService->markAsRead($conversation, $request->user());

        return response()->json([
            'message' => 'Messages marked as read.',
        ]);
    }
}
