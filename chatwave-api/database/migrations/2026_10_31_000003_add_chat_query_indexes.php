<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * SQLite and PostgreSQL do not index foreign key columns automatically (MySQL does), so
 * loading a conversation's messages or a user's conversations scanned whole tables.
 *
 * On MySQL these composite indexes take over from the implicit foreign key indexes.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            // Message history, newest first: WHERE conversation_id = ? ORDER BY id DESC
            $table->index(['conversation_id', 'id']);
        });

        Schema::table('conversation_participants', function (Blueprint $table) {
            // A user's conversations: WHERE user_id = ?
            $table->index(['user_id', 'conversation_id']);
        });
    }

    public function down(): void
    {
        // Re-add single-column indexes first so MySQL's foreign keys stay backed by an index.
        Schema::table('messages', function (Blueprint $table) {
            $table->index('conversation_id');
            $table->dropIndex(['conversation_id', 'id']);
        });

        Schema::table('conversation_participants', function (Blueprint $table) {
            $table->index('user_id');
            $table->dropIndex(['user_id', 'conversation_id']);
        });
    }
};
