<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Messages\StoreMessageRequest;
use App\Http\Requests\Messages\UpdateMessageRequest;
use App\Http\Resources\MessageResource;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\ConversationService;
use App\Support\MessageReceipts;
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
        // Fetching messages means the viewer's app has them.
        $this->conversationService->markDelivered($request->user(), $conversation);

        // Paginate on the unique, ever-increasing id. Paginating on created_at alone
        // skipped messages that shared a timestamp (common: second-level precision).
        $messages = $conversation->messages()
            ->with(Message::RESOURCE_RELATIONS)
            ->orderByDesc('id')
            ->cursorPaginate(30);

        $receipts = MessageReceipts::for($conversation->load('participants'), $request->user());

        return response()->json([
            'messages' => collect($messages->items())->map(fn (Message $message) => (new MessageResource($message))->withReceipts($receipts)),
            'next_cursor' => $messages->nextCursor()?->encode(),
            // Lets the app update the status of older messages it already has.
            'receipts' => $receipts?->toArray(),
        ]);
    }

    public function store(StoreMessageRequest $request, Conversation $conversation): JsonResponse
    {
        $message = DB::transaction(function () use ($request, $conversation) {
            $message = $conversation->messages()->create([
                'sender_id' => $request->user()->id,
                'type' => 'text',
                'body' => $request->validated('body'),
                'reply_to_id' => $request->validated('reply_to_id'),
            ]);

            // Keeps the conversation list sorted by latest activity.
            $conversation->touch();

            return $message;
        });

        $message->load(Message::RESOURCE_RELATIONS);
        $receipts = MessageReceipts::for($conversation->load('participants'), $request->user());

        return response()->json([
            'message' => (new MessageResource($message))->withReceipts($receipts),
        ], 201);
    }

    public function update(UpdateMessageRequest $request, Message $message): JsonResponse
    {
        $message->update([
            'body' => $request->validated('body'),
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
            'message' => __('Message deleted successfully.'),
        ]);
    }

    public function markAsRead(Request $request, Conversation $conversation): JsonResponse
    {
        $upTo = $request->validate([
            'message_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
        ])['message_id'] ?? null;

        $this->conversationService->markAsRead($conversation, $request->user(), $upTo);

        return response()->json([
            'message' => __('Messages marked as read.'),
        ]);
    }
}
