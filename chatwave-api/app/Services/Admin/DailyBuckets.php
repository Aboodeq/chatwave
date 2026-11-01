<?php

namespace App\Services\Admin;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Counts rows per calendar day in the viewer's time zone, with one grouped query per
 * series. Days are shifted by the zone's current UTC offset (so a change to or from
 * daylight saving time inside the range is off by an hour for those days).
 */
class DailyBuckets
{
    public readonly CarbonImmutable $from;

    public readonly CarbonImmutable $to;

    private readonly int $offsetMinutes;

    public function __construct(public readonly int $days, public readonly string $timezone)
    {
        $now = CarbonImmutable::now($timezone);

        $this->to = $now->endOfDay();
        $this->from = $now->startOfDay()->subDays($days - 1);
        $this->offsetMinutes = (int) $now->utcOffset();
    }

    /**
     * The start of the range in UTC, for WHERE clauses.
     */
    public function fromUtc(): CarbonImmutable
    {
        return $this->from->utc();
    }

    /**
     * @return array<string, int> counts keyed by "Y-m-d", with every day in the range present
     */
    public function count(Builder $query, string $column = 'created_at', ?string $distinct = null): array
    {
        $day = $this->dayExpression($query->qualifyColumn($column));
        $aggregate = $distinct ? 'COUNT(DISTINCT '.$query->qualifyColumn($distinct).')' : 'COUNT(*)';

        $rows = $query
            ->where($column, '>=', $this->fromUtc())
            ->selectRaw("{$day} as day, {$aggregate} as total")
            ->groupBy(DB::raw($day))
            ->pluck('total', 'day');

        $counts = [];

        for ($date = $this->from; $date->lte($this->to); $date = $date->addDay()) {
            $key = $date->format('Y-m-d');
            $counts[$key] = (int) ($rows[$key] ?? 0);
        }

        return $counts;
    }

    /**
     * SQL for "the local calendar day of this column". The offset is computed here, never
     * taken from input.
     */
    private function dayExpression(string $column): string
    {
        $minutes = $this->offsetMinutes;

        return match (DB::connection()->getDriverName()) {
            'sqlite' => sprintf("strftime('%%Y-%%m-%%d', %s, '%+d minutes')", $column, $minutes),
            'mysql', 'mariadb' => sprintf('DATE(DATE_ADD(%s, INTERVAL %d MINUTE))', $column, $minutes),
            'pgsql' => sprintf("TO_CHAR(%s + INTERVAL '%d minutes', 'YYYY-MM-DD')", $column, $minutes),
            'sqlsrv' => sprintf('CONVERT(char(10), DATEADD(minute, %d, %s), 23)', $minutes, $column),
            default => "DATE({$column})",
        };
    }
}
