<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ConversationController;
use App\Http\Controllers\Api\MessageController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login',    [AuthController::class, 'login']);
});

// Protected routes
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me',      [AuthController::class, 'me']);

    // Conversations
    Route::get('/conversations',          [ConversationController::class, 'index']);
    Route::post('/conversations',         [ConversationController::class, 'store']);
    Route::get('/conversations/{conversation}',    [ConversationController::class, 'show']);
    Route::delete('/conversations/{conversation}', [ConversationController::class, 'destroy']);

    // Messages
    Route::get('/conversations/{conversation}/messages',  [MessageController::class, 'index']);
    Route::post('/conversations/{conversation}/messages', [MessageController::class, 'store']);
    Route::put('/messages/{message}',                     [MessageController::class, 'update']);
    Route::delete('/messages/{message}',                  [MessageController::class, 'destroy']);
    Route::post('/conversations/{conversation}/read',     [MessageController::class, 'markAsRead']);
});
