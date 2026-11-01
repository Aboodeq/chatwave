import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { ChartTooltip } from "./ChartTooltip";
import { formatCount, formatDay, labelIndexes, niceTicks, stepThrough, useElementWidth } from "./chartUtils";

export interface DayValue {
  date: string;
  value: number;
}

/**
 * One series over time: a 2px line over a 10% wash, the last value labelled at its end.
 * A crosshair snaps to the nearest day on hover; arrow keys do the same from the keyboard.
 */
export function AreaChart({
  points,
  seriesLabel,
  description,
  height = 240,
}: {
  points: DayValue[];
  /** "messages", used in the tooltip. */
  seriesLabel: string;
  /** Spoken summary, e.g. "1,284 messages in the last 30 days". */
  description: string;
  height?: number;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const ticks = niceTicks(Math.max(0, ...points.map((point) => point.value)));
  const top = ticks[ticks.length - 1];
  const left = Math.max(...ticks.map((tick) => formatCount(tick).length)) * 7 + 12;
  const margin = { top: 16, right: 40, bottom: 28, left };
  const plotWidth = Math.max(0, width - margin.left - margin.right);
  const plotHeight = height - margin.top - margin.bottom;
  const x = (i: number) => margin.left + (points.length <= 1 ? plotWidth / 2 : (i / (points.length - 1)) * plotWidth);
  const y = (value: number) => margin.top + plotHeight - (value / top) * plotHeight;
  const weekdays = points.length <= 7;

  const line = points.map((point, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(point.value).toFixed(1)}`).join("");
  const area = points.length ? `${line}L${x(points.length - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z` : "";
  const last = points.length - 1;

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (points.length === 0 || plotWidth === 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const fraction = (event.clientX - bounds.left - margin.left) / plotWidth;
    setActive(Math.min(last, Math.max(0, Math.round(fraction * last))));
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const next = stepThrough(event.key, active, points.length);
    if (next === undefined) return;
    event.preventDefault();
    setActive(next);
  };

  return (
    <div
      ref={ref}
      tabIndex={0}
      role="group"
      aria-label={`${description}. Use the arrow keys to read each day.`}
      onKeyDown={onKeyDown}
      onBlur={() => setActive(null)}
      className="relative rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ height }}
    >
      {width > 0 && (
        <svg width={width} height={height} onPointerMove={onPointerMove} onPointerLeave={() => setActive(null)} aria-hidden="true">
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)} className="stroke-line" strokeWidth={1} shapeRendering="crispEdges" />
              <text x={margin.left - 10} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-fg-subtle text-[11px] tabular-nums">
                {formatCount(tick)}
              </text>
            </g>
          ))}
          {labelIndexes(points.length, Math.floor(plotWidth / 64)).map((i) => (
            <text key={i} x={x(i)} y={height - 8} textAnchor={i === last ? "end" : "middle"} className="fill-fg-subtle text-[11px]">
              {formatDay(points[i].date, weekdays ? "axis-weekday" : "axis")}
            </text>
          ))}

          <path d={area} className="fill-viz-1/10" />
          <path d={line} fill="none" className="stroke-viz-1" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {active !== null && (
            <line x1={x(active)} x2={x(active)} y1={margin.top} y2={y(0)} className="stroke-fg-subtle/60" strokeWidth={1} shapeRendering="crispEdges" />
          )}

          {last >= 0 && (
            <>
              <circle cx={x(last)} cy={y(points[last].value)} r={4} className="fill-viz-1 stroke-surface" strokeWidth={2} />
              <text x={x(last) + 9} y={y(points[last].value)} dy="0.32em" className="fill-fg text-[12px] font-semibold tabular-nums">
                {formatCount(points[last].value)}
              </text>
            </>
          )}
          {active !== null && active !== last && (
            <circle cx={x(active)} cy={y(points[active].value)} r={4} className="fill-viz-1 stroke-surface" strokeWidth={2} />
          )}
        </svg>
      )}

      {active !== null && points[active] && (
        <ChartTooltip
          x={x(active)}
          y={y(points[active].value)}
          width={width}
          title={formatDay(points[active].date, "long")}
          rows={[{ key: "value", value: formatCount(points[active].value), label: seriesLabel, swatch: "bg-viz-1" }]}
        />
      )}
    </div>
  );
}
