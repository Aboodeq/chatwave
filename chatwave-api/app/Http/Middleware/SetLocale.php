<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Answers in the language the app asks for (Accept-Language): English or Arabic.
 * Error and validation messages, emails and text messages follow it.
 */
class SetLocale
{
    public const SUPPORTED = ['en', 'ar'];

    public function handle(Request $request, Closure $next): Response
    {
        $locale = $request->getPreferredLanguage(self::SUPPORTED) ?? config('app.locale');
        app()->setLocale($locale);

        $response = $next($request);
        $response->headers->set('Content-Language', $locale);

        return $response;
    }
}
