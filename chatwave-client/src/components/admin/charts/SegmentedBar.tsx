import { useState } from "react";
import { cn } from "../../../lib/utils";
import { ChartTooltip } from "./ChartTooltip";
import { formatCount, useElementWidth } from "./chartUtils";

export interface Part {
  key: string;
  label: string;
  value: number;
  /** A background class from the validated chart colors, e.g. "bg-viz-1". */
  color: string;
  /** What a value counts, for the tooltip: "people". */
  unit: string;
}

/**
 * One whole split into a few parts, read at a glance: 28px blocks with 2px gaps, each share
 * printed inside when it fits (white, which reads best on these fills), names in the legend.
 */
export function SegmentedBar({ parts, label }: { parts: Part[]; label: string }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  const visible = parts.filter((part) => part.value > 0);
  const gaps = Math.max(0, visible.length - 1) * 2;
  const share = (value: number) => (total ? Math.round((value / total) * 100) : 0);
  const summary = parts.map((part) => `${part.label} ${formatCount(part.value)} (${share(part.value)}%)`).join(", ");

  // Where each block starts, for placing the tooltip.
  const blocks = visible.reduce<{ part: Part; start: number; width: number }[]>((list, part) => {
    const previous = list.at(-1);
    const start = previous ? previous.start + previous.width + 2 : 0;
    return [...list, { part, start, width: total ? ((width - gaps) * part.value) / total : 0 }];
  }, []);

  return (
    <div>
      <div ref={ref} role="img" aria-label={`${label}: ${summary}`} className="relative flex h-7 gap-0.5">
        {total === 0 ? (
          <div className="flex-1 rounded bg-surface-2" />
        ) : (
          blocks.map(({ part, width: blockWidth }, index) => {
            const text = `${share(part.value)}%`;
            const fits = blockWidth >= text.length * 7.5 + 16;
            return (
              <div
                key={part.key}
                tabIndex={0}
                aria-label={`${part.label}: ${formatCount(part.value)} ${part.unit}, ${share(part.value)}%`}
                onPointerEnter={() => setActive(index)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                className={cn(
                  "flex h-full items-center rounded px-2 text-xs font-semibold text-white outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                  part.color,
                  active !== null && active !== index && "opacity-60",
                )}
                style={{ flexGrow: part.value, flexBasis: 0 }}
              >
                {fits && <span aria-hidden="true">{text}</span>}
              </div>
            );
          })
        )}
        {active !== null && blocks[active] && (
          <ChartTooltip
            x={blocks[active].start + blocks[active].width / 2}
            y={0}
            width={width}
            title={blocks[active].part.label}
            rows={[
              {
                key: "value",
                value: `${formatCount(blocks[active].part.value)} · ${share(blocks[active].part.value)}%`,
                label: blocks[active].part.unit,
                swatch: blocks[active].part.color,
              },
            ]}
          />
        )}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5" aria-hidden="true">
        {parts.map((part) => (
          <li key={part.key} className="flex items-center gap-2 text-[0.8125rem] text-fg-muted">
            <span className={cn("size-2.5 rounded-[3px]", part.color)} />
            {part.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
