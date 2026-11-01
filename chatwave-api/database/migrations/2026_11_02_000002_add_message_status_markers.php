<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Message status (sent, delivered, seen) tracked per person per conversation: the newest
 * message their app has received, and the newest they've read. Two numbers per person
 * replace a receipt row per message per person, so marking a whole chat read is one
 * update and unread counts are a range count.
 *
 * Read markers are filled in from the old message_receipts table, which is then removed.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversation_participants', function (Blueprint $table) {
            $table->unsignedBigInteger('last_delivered_message_id')->nullable()->after('last_read_at');
            $table->unsignedBigInteger('last_read_message_id')->nullable()->after('last_delivered_message_id');
        });

        $read = DB::table('message_receipts')
            ->join('messages', 'messages.id', '=', 'message_receipts.message_id')
            ->whereNotNull('message_receipts.read_at')
            ->groupBy('messages.conversation_id', 'message_receipts.user_id')
            ->select('messages.conversation_id', 'message_receipts.user_id', DB::raw('MAX(messages.id) as last_id'))
            ->get();

        foreach ($read as $row) {
            DB::table('conversation_participants')
                ->where('conversation_id', $row->conversation_id)
                ->where('user_id', $row->user_id)
                ->update(['last_read_message_id' => $row->last_id, 'last_delivered_message_id' => $row->last_id]);
        }

        Schema::dropIfExists('message_receipts');
    }

    public function down(): void
    {
        Schema::create('message_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('message_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->unique(['message_id', 'user_id']);
        });

        Schema::table('conversation_participants', function (Blueprint $table) {
            $table->dropColumn(['last_delivered_message_id', 'last_read_message_id']);
        });
    }
};
