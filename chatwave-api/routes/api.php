<?php

use App\Http\Controllers\Api\Admin\ActivityController as AdminActivityController;
use App\Http\Controllers\Api\Admin\ModerationController as AdminModerationController;
use App\Http\Controllers\Api\Admin\OverviewController as AdminOverviewController;
use App\Http\Controllers\Api\Admin\RoleController as AdminRoleController;
use App\Http\Controllers\Api\Admin\SystemController as AdminSystemController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AvatarController;
use App\Http\Controllers\Api\BlockController;
use App\Http\Controllers\Api\ConversationController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\SessionController;
use App\Http\Controllers\Api\UserController;
use App\Http\Middleware\EnsureAccountIsActive;
use App\Http\Middleware\RecordPresence;
use Illuminate\Support\Facades\Route;

// Every API route is also limited to 120 requests per minute per user/IP ("api" limiter).

// Public routes
Route::prefix('auth')->group(function () {
    Route::middleware('throttle:auth')->group(function () {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login']);
    });

    // Signing up with a phone number starts by texting a code to it.
    Route::post('/register/code', [AuthController::class, 'sendRegistrationCode'])
        ->middleware('throttle:code-send');

    // Password reset by email, or by text message for phone accounts.
    Route::post('/password/otp', [PasswordResetController::class, 'send'])
        ->middleware('throttle:code-send');
    Route::post('/password/otp/verify', [PasswordResetController::class, 'verify'])
        ->middleware('throttle:code-check');
    Route::post('/password/reset', [PasswordResetController::class, 'reset'])
        ->middleware('throttle:code-check');
});

// Profile photos (public, so <img> tags can load them). Only random upload names match.
Route::get('/avatars/{file}', [AvatarController::class, 'show'])
    ->where('file', '[A-Za-z0-9]{20,64}\.(jpg|jpeg|png|webp)')
    ->name('avatars.show');

// Protected routes. Suspended accounts are turned away; RecordPresence keeps "online" and
// "last seen" current.
Route::middleware(['auth:sanctum', EnsureAccountIsActive::class, RecordPresence::class])->group(function () {

    // Auth
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Your profile and settings (the third throttle argument keeps the counters separate)
    Route::patch('/profile', [ProfileController::class, 'update']);
    Route::post('/profile/avatar', [ProfileController::class, 'updateAvatar'])
        ->middleware('throttle:10,1,avatar');
    Route::delete('/profile/avatar', [ProfileController::class, 'destroyAvatar']);
    Route::put('/profile/password', [ProfileController::class, 'updatePassword'])
        ->middleware('throttle:6,1,password');

    // Devices you're signed in on
    Route::get('/sessions', [SessionController::class, 'index']);
    Route::delete('/sessions', [SessionController::class, 'destroyOthers']);
    Route::delete('/sessions/{session}', [SessionController::class, 'destroy'])->whereNumber('session');

    // People search, for starting conversations
    Route::get('/users', [UserController::class, 'index']);

    // Blocking
    Route::get('/blocks', [BlockController::class, 'index']);
    Route::post('/users/{user}/block', [BlockController::class, 'store']);
    Route::delete('/users/{user}/block', [BlockController::class, 'destroy']);

    // Conversations
    Route::get('/conversations', [ConversationController::class, 'index']);
    Route::post('/conversations', [ConversationController::class, 'store']);
    Route::get('/conversations/{conversation}', [ConversationController::class, 'show'])
        ->can('view', 'conversation');
    Route::delete('/conversations/{conversation}', [ConversationController::class, 'destroy'])
        ->can('leave', 'conversation');

    // Messages
    Route::get('/conversations/{conversation}/messages', [MessageController::class, 'index'])
        ->can('view', 'conversation');
    Route::post('/conversations/{conversation}/messages', [MessageController::class, 'store'])
        ->can('send', 'conversation');
    Route::post('/conversations/{conversation}/read', [MessageController::class, 'markAsRead'])
        ->can('view', 'conversation');
    Route::put('/messages/{message}', [MessageController::class, 'update'])
        ->can('update', 'message');
    Route::delete('/messages/{message}', [MessageController::class, 'destroy'])
        ->can('delete', 'message');

    // Admin dashboard. Role-based: each area needs its own permission (App\Enums\Permission).
    Route::prefix('admin')->middleware('can:admin')->group(function () {
        Route::get('/overview', AdminOverviewController::class)->middleware('can:admin.overview');

        Route::middleware('can:admin.people')->group(function () {
            Route::get('/users', [AdminUserController::class, 'index']);
            Route::get('/users/{user}', [AdminUserController::class, 'show']);
        });

        Route::middleware('can:admin.moderate')->group(function () {
            Route::post('/users/{user}/suspension', [AdminModerationController::class, 'suspend']);
            Route::delete('/users/{user}/suspension', [AdminModerationController::class, 'restore']);
            Route::delete('/users/{user}/sessions', [AdminModerationController::class, 'signOut']);
        });

        // Anyone in the dashboard may read the list of roles (for names and filters).
        Route::get('/roles', [AdminRoleController::class, 'index']);

        Route::middleware('can:admin.roles')->group(function () {
            Route::put('/users/{user}/role', [AdminModerationController::class, 'updateRole']);
            Route::post('/roles', [AdminRoleController::class, 'store']);
            Route::put('/roles/{role}', [AdminRoleController::class, 'update']);
            Route::delete('/roles/{role}', [AdminRoleController::class, 'destroy']);
        });

        Route::get('/activity', AdminActivityController::class)->middleware('can:admin.activity');
        Route::get('/system', AdminSystemController::class)->middleware('can:admin.system');
    });
});
