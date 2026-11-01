import type { ReactNode } from "react";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "../../lib/utils";
import { formatCount } from "./charts/chartUtils";
import { Sparkline } from "./charts/Sparkline";

interface Delta {
  current: number;
  previous: number;
  /** "vs previous 30 days" */
  period: string;
}

/**
 * A headline number: label, value, optional change against the previous period (with an
 * arrow, so it never relies on color) and an optional sparkline.
 */
export function StatTile({
  label,
  value,
  delta,
  trend,
  footnote,
}: {
  label: string;
  value: number;
  delta?: Delta;
  trend?: number[];
  footnote?: ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl bg-surface p-5 shadow-soft ring-1 ring-line">
      <p className="text-sm font-medium text-fg-muted">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-[1.875rem] leading-none font-semibold tracking-tight text-fg">{formatCount(value)}</p>
        {trend && <Sparkline values={trend} />}
      </div>
      <div className="mt-3 text-[0.8125rem] text-fg-muted">{delta ? <DeltaText delta={delta} /> : footnote}</div>
    </div>
  );
}

function DeltaText({ delta }: { delta: Delta }) {
  const change = delta.current - delta.previous;
  const Icon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
  const amount =
    delta.previous > 0
      ? `${change > 0 ? "+" : change < 0 ? "−" : ""}${Math.abs(Math.round((change / delta.previous) * 100))}%`
      : change > 0
        ? `+${formatCount(change)}`
        : "No change";

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "inline-flex items-center gap-1 font-semibold",
          change > 0 ? "text-success" : change < 0 ? "text-danger" : "text-fg-muted",
        )}
      >
        <Icon className="size-3.5" aria-hidden="true" />
        {amount}
      </span>
      <span>{delta.period}</span>
    </span>
  );
}
