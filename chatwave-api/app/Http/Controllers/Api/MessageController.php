<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\MessageResource;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\MessageReceipt;
use App\Services\ConversationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function __construct(protected ConversationService $conversationService) {}

    public function index(Request $request, Conversation $conversation): JsonResponse
    {
        if (!$this->conversationService->userBelongsToConversation($request->user(), $conversation)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $messages = $conversation->messages()
            ->with(['sender', 'media', 'reactions.user', 'replyTo.sender'])
            ->latest()
            ->cursorPaginate(30);

        return response()->json([
            'messages'    => MessageResource::collection($messages->items()),
            'next_cursor' => $messages->nextCursor()?->encode(),
        ]);
    }

    public function store(Request $request, Conversation $conversation): JsonResponse
    {
        if (!$this->conversationService->userBelongsToConversation($request->user(), $conversation)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $request->validate([
            'body'        => ['required_without:media_ids', 'nullable', 'string', 'max:5000'],
            'type'        => ['sometimes', 'in:text,image,file,audio'],
            'reply_to_id' => ['nullable', 'exists:messages,id'],
        ]);

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id'       => $request->user()->id,
            'type'            => $request->type ?? 'text',
            'body'            => $request->body,
            'reply_to_id'     => $request->reply_to_id,
        ]);

        $message->load(['sender', 'media', 'reactions', 'replyTo.sender']);

        // Update conversation updated_at for sorting
        $conversation->touch();

        return response()->json([
            'message' => new MessageResource($message),
        ], 201);
    }

    public function update(Request $request, Message $message): JsonResponse
    {
        if ($message->sender_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $request->validate([
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $message->update([
            'body'      => $request->body,
            'is_edited' => true,
            'edited_at' => now(),
        ]);

        $message->load(['sender', 'media', 'reactions', 'replyTo.sender']);

        return response()->json([
            'message' => new MessageResource($message),
        ]);
    }

    public function destroy(Request $request, Message $message): JsonResponse
    {
        if ($message->sender_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $message->delete();

        return response()->json([
            'message' => 'Message deleted successfully.',
        ]);
    }

    public function markAsRead(Request $request, Conversation $conversation): JsonResponse
    {
        if (!$this->conversationService->userBelongsToConversation($request->user(), $conversation)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $unreadMessages = $conversation->messages()
            ->where('sender_id', '!=', $request->user()->id)
            ->whereDoesntHave('receipts', function ($q) use ($request) {
                $q->where('user_id', $request->user()->id)
                    ->whereNotNull('read_at');
            })
            ->get();

        foreach ($unreadMessages as $msg) {
            MessageReceipt::updateOrCreate(
                ['message_id' => $msg->id, 'user_id' => $request->user()->id],
                ['read_at' => now(), 'delivered_at' => now()]
            );
        }

        return response()->json([
            'message' => 'Messages marked as read.',
        ]);
    }
}
