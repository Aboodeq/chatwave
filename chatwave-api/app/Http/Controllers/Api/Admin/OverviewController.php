<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\AdminActionResource;
use App\Http\Resources\Admin\AdminUserResource;
use App\Models\AdminAction;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Services\Admin\DailyBuckets;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Headline numbers and daily activity for the admin dashboard.
 */
class OverviewController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'days' => ['sometimes', 'integer', Rule::in([7, 30, 90])],
            'timezone' => ['sometimes', 'string', 'timezone:all'],
        ]);

        $buckets = new DailyBuckets((int) ($validated['days'] ?? 30), $validated['timezone'] ?? 'UTC');
        $previousFrom = $buckets->fromUtc()->subDays($buckets->days);

        $messages = $buckets->count(Message::query());
        $senders = $buckets->count(Message::query(), distinct: 'sender_id');
        $signUps = $buckets->count(User::query());

        $series = array_map(
            fn (string $date) => [
                'date' => $date,
                'messages' => $messages[$date],
                'senders' => $senders[$date],
                'sign_ups' => $signUps[$date],
            ],
            array_keys($messages),
        );

        $todayStart = CarbonImmutable::now($buckets->timezone)->startOfDay()->utc();

        return response()->json([
            'range' => [
                'days' => $buckets->days,
                'timezone' => $buckets->timezone,
                'from' => $buckets->from->format('Y-m-d'),
                'to' => $buckets->to->format('Y-m-d'),
            ],
            'totals' => [
                'people' => User::count(),
                'sign_ups' => array_sum($signUps),
                'sign_ups_previous' => User::whereBetween('created_at', [$previousFrom, $buckets->fromUtc()])->count(),
                'online_now' => User::where('is_online', true)
                    ->where('last_seen_at', '>=', now()->subSeconds(User::ONLINE_WINDOW_SECONDS))
                    ->count(),
                'active_today' => User::where('last_seen_at', '>=', $todayStart)->count(),
                'messages' => array_sum($messages),
                'messages_previous' => Message::whereBetween('created_at', [$previousFrom, $buckets->fromUtc()])->count(),
                'conversations' => Conversation::count(),
                'admins' => User::where('role', UserRole::Admin)->count(),
                'suspended' => User::whereNotNull('suspended_at')->count(),
                'phone_accounts' => User::whereNull('email')->count(),
            ],
            'series' => $series,
            'recent_sign_ups' => AdminUserResource::collection(User::latest('id')->limit(6)->get()),
            'recent_activity' => AdminActionResource::collection(
                AdminAction::with(['admin', 'target'])->latest('id')->limit(6)->get()
            ),
        ]);
    }
}
