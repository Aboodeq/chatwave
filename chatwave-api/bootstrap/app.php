<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->throttleApi();

        // There is no web login page. The default redirect called route('login'), so API
        // requests without "Accept: application/json" crashed with a 500 instead of a 401.
        $middleware->redirectGuestsTo(fn (Request $request) => $request->is('api/*') ? null : '/');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // API clients always get JSON, even when they forget the Accept header.
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson()
        );

        // The default message names internal classes ("No query results for model [App\Models\...]").
        // Also covers policies that deny as "not found".
        $exceptions->render(function (HttpExceptionInterface $e, Request $request) {
            if ($request->is('api/*') && $e->getStatusCode() === 404) {
                return response()->json(['message' => 'Not found.'], 404);
            }
        });

        // Tell clients how long to wait, in the body as well as the Retry-After header.
        $exceptions->render(function (ThrottleRequestsException $e, Request $request) {
            if ($request->is('api/*')) {
                $retryAfter = (int) ($e->getHeaders()['Retry-After'] ?? 60);

                return response()->json([
                    'message' => "Too many requests. Please try again in {$retryAfter} seconds.",
                    'retry_after' => $retryAfter,
                ], 429, $e->getHeaders());
            }
        });
    })->create();
