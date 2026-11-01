import { useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/utils";
import type { DayValue } from "./AreaChart";
import { ChartTooltip } from "./ChartTooltip";
import { formatCount, formatDay, labelIndexes, niceTicks, stepThrough, useElementWidth, useIsRtl } from "./chartUtils";

/** A column with a 4px rounded top and a square foot on the baseline. */
function columnPath(center: number, width: number, baseline: number, top: number): string {
  const height = baseline - top;
  if (height <= 0) return "";
  const r = Math.min(4, width / 2, height);
  const l = center - width / 2;
  const right = center + width / 2;
  return `M${l},${baseline}V${top + r}Q${l},${top} ${l + r},${top}H${right - r}Q${right},${top} ${right},${top + r}V${baseline}Z`;
}

/**
 * One value per day as thin columns (24px at most, 2px apart), the peak labelled on its cap.
 * Each day's whole column is its hover target; arrow keys step through the days.
 * In Arabic the chart is mirrored (time runs right to left, the axis sits on the right).
 */
export function ColumnChart({
  points,
  seriesLabel,
  description,
  height = 200,
}: {
  points: DayValue[];
  /** The noun for a value, e.g. count => "people", used in the tooltip. */
  seriesLabel: (count: number) => string;
  description: string;
  height?: number;
}) {
  const { t } = useTranslation();
  const rtl = useIsRtl();
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const max = Math.max(0, ...points.map((point) => point.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  // Laid out from the start side (left in English, right in Arabic), then mirrored if needed.
  const axis = Math.max(...ticks.map((tick) => formatCount(tick).length)) * 7 + 12;
  const margin = { top: 18, end: 8, bottom: 28, start: axis };
  const plotWidth = Math.max(0, width - margin.start - margin.end);
  const plotHeight = height - margin.top - margin.bottom;
  const slot = points.length ? plotWidth / points.length : 0;
  const barWidth = Math.max(1, Math.min(24, slot - 2));
  const side = (offset: number) => (rtl ? width - offset : offset);
  const center = (i: number) => side(margin.start + slot * (i + 0.5));
  const y = (value: number) => margin.top + plotHeight - (value / top) * plotHeight;
  const peak = max > 0 ? points.findIndex((point) => point.value === max) : -1;
  const weekdays = points.length <= 7;

  const onKeyDown = (event: KeyboardEvent) => {
    const next = stepThrough(event.key, active, points.length, rtl);
    if (next === undefined) return;
    event.preventDefault();
    setActive(next);
  };

  return (
    <div
      ref={ref}
      tabIndex={0}
      role="group"
      aria-label={t("admin.chart.keys", { description })}
      onKeyDown={onKeyDown}
      onBlur={() => setActive(null)}
      className="relative rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ height }}
    >
      {width > 0 && (
        <svg
          width={width}
          height={height}
          onPointerLeave={() => setActive(null)}
          aria-hidden="true"
          // Text anchors follow the direction, so "end" stays on the axis side.
          style={{ direction: rtl ? "rtl" : "ltr" }}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={side(margin.start)} x2={side(width - margin.end)} y1={y(tick)} y2={y(tick)} className="stroke-line" strokeWidth={1} shapeRendering="crispEdges" />
              <text x={side(margin.start - 10)} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-fg-subtle text-[11px] tabular-nums">
                {formatCount(tick)}
              </text>
            </g>
          ))}
          {labelIndexes(points.length, Math.floor(plotWidth / 64)).map((i) => (
            <text key={i} x={center(i)} y={height - 8} textAnchor={i === points.length - 1 ? "end" : "middle"} className="fill-fg-subtle text-[11px]">
              {formatDay(points[i].date, weekdays ? "axis-weekday" : "axis")}
            </text>
          ))}

          {points.map((point, i) => (
            <path
              key={point.date}
              d={columnPath(center(i), barWidth, y(0), y(point.value))}
              className={cn("fill-viz-1 transition-opacity", active !== null && active !== i && "opacity-45")}
            />
          ))}

          {peak >= 0 && active === null && (
            <text x={center(peak)} y={y(max) - 6} textAnchor="middle" className="fill-fg-muted text-[11px] font-semibold tabular-nums">
              {formatCount(max)}
            </text>
          )}

          {/* Each day's full-height column is its hover target. */}
          {points.map((point, i) => (
            <rect
              key={point.date}
              x={center(i) - slot / 2}
              y={margin.top}
              width={slot}
              height={plotHeight}
              fill="transparent"
              onPointerEnter={() => setActive(i)}
            />
          ))}
        </svg>
      )}

      {active !== null && points[active] && (
        <ChartTooltip
          x={center(active)}
          y={y(points[active].value)}
          width={width}
          title={formatDay(points[active].date, "long")}
          rows={[
            {
              key: "value",
              value: formatCount(points[active].value),
              label: seriesLabel(points[active].value),
              swatch: "bg-viz-1",
            },
          ]}
        />
      )}
    </div>
  );
}
