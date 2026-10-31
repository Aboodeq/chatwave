<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | The React client authenticates with bearer tokens (not cookies), so
    | credentials are not shared. In production, set CORS_ALLOWED_ORIGINS
    | to the client's origin(s), comma separated.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('CORS_ALLOWED_ORIGINS', '*'))
    ))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    // Lets the client read how long to wait after a 429.
    'exposed_headers' => ['Retry-After'],

    'max_age' => 0,

    'supports_credentials' => false,

];
