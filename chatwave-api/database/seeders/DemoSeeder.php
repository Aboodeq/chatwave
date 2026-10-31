<?php

namespace Database\Seeders;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\MessageReceipt;
use App\Models\User;
use App\Services\ConversationService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Sample people and conversations for trying the app locally:
 *
 *   php artisan db:seed --class=DemoSeeder
 *
 * Sign in as test@example.com / password. Every demo account uses the password "password".
 */
class DemoSeeder extends Seeder
{
    public function run(ConversationService $conversations): void
    {
        $me = User::firstOrCreate(
            ['email' => 'test@example.com'],
            ['name' => 'Test User', 'password' => 'password', 'email_verified_at' => now()],
        );

        $people = collect([
            ['Maya Okafor', 'maya@example.com', 'Designing the new onboarding'],
            ['Daniel Reyes', 'daniel@example.com', 'On call this week'],
            ['Lina Haddad', 'lina@example.com', 'In Amman until Friday'],
            ['Sam Carter', 'sam@example.com', 'Hey there! I am using ChatWave.'],
            ['Yuki Tanaka', 'yuki@example.com', 'Heads down, async replies'],
        ])->map(fn ($p) => User::firstOrCreate(
            ['email' => $p[1]],
            ['name' => $p[0], 'password' => 'password', 'status_text' => $p[2], 'email_verified_at' => now()],
        ));

        [$maya, $daniel, $lina, $sam, $yuki] = $people->all();

        // Presence, so "Online" and "Last seen" show up. Yuki keeps it private.
        foreach ([
            [$maya, ['is_online' => true, 'last_seen_at' => now()]],
            [$daniel, ['is_online' => false, 'last_seen_at' => now()->subHours(3)]],
            [$lina, ['is_online' => false, 'last_seen_at' => now()->subDay()->setTime(21, 14)]],
            [$sam, ['is_online' => false, 'last_seen_at' => now()->subDays(4)]],
            [$yuki, ['is_online' => true, 'last_seen_at' => now(), 'show_online_status' => false]],
        ] as [$person, $presence]) {
            $person->forceFill($presence)->save();
        }

        // [sender, body, minutes ago, reply to (index in this thread)?, edited?]
        $this->thread($conversations, $me, $maya, [
            [$maya, 'Morning! Did the new onboarding build go out?', 190],
            [$me, 'Shipped at 9:02. Release notes are in the channel.', 186],
            [$maya, 'Amazing. The welcome screen feels so much calmer now', 184],
            [$me, 'Agreed. Want to review the empty states together later?', 120],
            [$maya, 'Yes! 3pm works for me', 34, 3],
            [$maya, "I'll bring the latest mockups", 33],
        ], unread: 2);

        $this->thread($conversations, $me, $daniel, [
            [$daniel, 'Heads up: I restarted the queue worker, reset emails are flowing again.', 60 * 26],
            [$me, 'Thanks! Was it the memory limit again?', 60 * 26 - 4],
            [$daniel, 'Yep. I bumped it and added an alert so we hear about it first.', 60 * 26 - 9, null, true],
            [$me, 'Perfect, appreciate it 🙏', 60 * 25],
        ]);

        $this->thread($conversations, $me, $lina, [
            [$lina, 'مرحبا! Are we still on for the user interviews on Thursday?', 60 * 50],
            [$me, 'Yes, 10am. I booked the small meeting room.', 60 * 49],
            [$lina, 'شكراً! I will send the participant list tonight.', 8],
        ], unread: 1);

        $this->thread($conversations, $me, $sam, [
            [$me, 'Welcome to the team, Sam! Ping me if you need anything.', 60 * 24 * 4],
            [$sam, 'Thank you! Excited to be here.', 60 * 24 * 4 - 30],
        ]);
    }

    /**
     * @param  array<int, array{0: User, 1: string, 2: int, 3?: int|null, 4?: bool}>  $lines
     */
    private function thread(ConversationService $conversations, User $me, User $other, array $lines, int $unread = 0): void
    {
        $conversation = $conversations->findOrCreatePrivateConversation($me, $other);

        if ($conversation->messages()->exists()) {
            return; // already seeded
        }

        $created = [];

        foreach ($lines as $i => $line) {
            [$sender, $body, $minutesAgo] = $line;
            $at = Carbon::now()->subMinutes($minutesAgo);

            $message = new Message([
                'conversation_id' => $conversation->id,
                'sender_id' => $sender->id,
                'type' => 'text',
                'body' => $body,
                'reply_to_id' => isset($line[3]) ? $created[$line[3]]->id : null,
                'is_edited' => $line[4] ?? false,
                'edited_at' => ($line[4] ?? false) ? $at->copy()->addMinutes(2) : null,
            ]);
            $message->created_at = $at;
            $message->updated_at = $at;
            $message->save();

            $created[$i] = $message;
        }

        // Everything except the last $unread incoming messages has been read by both people.
        $incoming = collect($created)->filter(fn (Message $m) => $m->sender_id !== $me->id)->values();
        $readByMe = $incoming->slice(0, max(0, $incoming->count() - $unread));

        foreach ($created as $message) {
            $reader = $message->sender_id === $me->id ? $other : $me;

            if ($reader->is($me) && ! $readByMe->contains('id', $message->id)) {
                continue;
            }

            MessageReceipt::create([
                'message_id' => $message->id,
                'user_id' => $reader->id,
                'delivered_at' => $message->created_at,
                'read_at' => $message->created_at,
            ]);
        }

        Conversation::whereKey($conversation->id)->update(['updated_at' => end($created)->created_at]);
    }
}
