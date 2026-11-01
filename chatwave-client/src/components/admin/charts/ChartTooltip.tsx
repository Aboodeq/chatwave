import type { ReactNode } from "react";

/**
 * The hover/focus readout: the value leads, the label follows, keyed by a short stroke of
 * the series color. Positioned above the point, kept inside the chart.
 */
export function ChartTooltip({
  x,
  y,
  width,
  title,
  rows,
}: {
  x: number;
  y: number;
  /** The chart's width, to keep the tooltip inside it. */
  width: number;
  title: string;
  rows: { key: string; value: ReactNode; label: string; swatch: string }[];
}) {
  const left = Math.min(Math.max(x, 76), Math.max(76, width - 76));

  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 min-w-[8.5rem] -translate-x-1/2 -translate-y-full rounded-xl bg-surface px-3 py-2 shadow-pop ring-1 ring-line"
      style={{ left, top: y - 10 }}
    >
      <p className="text-[0.6875rem] font-medium text-fg-subtle">{title}</p>
      {rows.map((row) => (
        <p key={row.key} className="mt-1 flex items-center gap-2">
          <span aria-hidden="true" className={`h-0.5 w-3 rounded-full ${row.swatch}`} />
          <span className="text-sm font-semibold text-fg tabular-nums">{row.value}</span>
          <span className="text-xs text-fg-muted">{row.label}</span>
        </p>
      ))}
    </div>
  );
}
