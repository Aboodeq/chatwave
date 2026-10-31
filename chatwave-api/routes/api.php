<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ConversationController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\UserController;
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

// Protected routes
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

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
