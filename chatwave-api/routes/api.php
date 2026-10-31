<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AvatarController;
use App\Http\Controllers\Api\ConversationController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\SessionController;
use App\Http\Controllers\Api\UserController;
use App\Http\Middleware\RecordPresence;
use Illuminate\Support\Facades\Route;

// Every API route is also limited to 120 requests per minute per user/IP ("api" limiter).

// Public routes
Route::prefix('auth')->group(function () {
    Route::middleware('throttle:auth')->group(function () {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login']);
    });

    Route::post('/password/otp', [PasswordResetController::class, 'send'])
        ->middleware('throttle:password-otp-send');
    Route::post('/password/otp/verify', [PasswordResetController::class, 'verify'])
        ->middleware('throttle:password-otp-check');
    Route::post('/password/reset', [PasswordResetController::class, 'reset'])
        ->middleware('throttle:password-otp-check');
});

// Profile photos (public, so <img> tags can load them). Only random upload names match.
Route::get('/avatars/{file}', [AvatarController::class, 'show'])
    ->where('file', '[A-Za-z0-9]{20,64}\.(jpg|jpeg|png|webp)')
    ->name('avatars.show');

// Protected routes. RecordPresence keeps "online" and "last seen" current.
Route::middleware(['auth:sanctum', RecordPresence::class])->group(function () {

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
        ->can('view', 'conversation');
    Route::post('/conversations/{conversation}/read', [MessageController::class, 'markAsRead'])
        ->can('view', 'conversation');
    Route::put('/messages/{message}', [MessageController::class, 'update'])
        ->can('update', 'message');
    Route::delete('/messages/{message}', [MessageController::class, 'destroy'])
        ->can('delete', 'message');
});
