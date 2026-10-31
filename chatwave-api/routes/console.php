<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Housekeeping. Requires the scheduler: `php artisan schedule:work` locally, or a cron entry in production.
Schedule::command('sanctum:prune-expired --hours=24')->daily();
Schedule::command('model:prune')->daily(); // expired password reset codes
