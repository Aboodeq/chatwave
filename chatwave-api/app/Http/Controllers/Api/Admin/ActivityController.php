<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\AdminActionResource;
use App\Models\AdminAction;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * The admin audit log, newest first.
 */
class ActivityController extends Controller
{
    public function __invoke(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'per_page' => ['sometimes', 'integer', 'min:5', 'max:100'],
        ]);

        $actions = AdminAction::with(['admin', 'target'])
            ->latest('id')
            ->paginate((int) ($validated['per_page'] ?? 25));

        return AdminActionResource::collection($actions);
    }
}
