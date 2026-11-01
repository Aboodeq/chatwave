import { useState, type ReactNode } from "react";
import { BarChart3, Table2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/utils";
import { formatCount } from "./chartUtils";

/**
 * A chart with its title, and a switch to the same numbers as a table (the accessible twin
 * of every chart). `dimmed` holds the old chart at reduced opacity while new data loads.
 */
export function ChartCard({
  title,
  subtitle,
  chart,
  table,
  dimmed = false,
  className,
}: {
  title: string;
  subtitle?: ReactNode;
  chart: ReactNode;
  table: ReactNode;
  dimmed?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const [showTable, setShowTable] = useState(false);

  return (
    <section className={cn("rounded-2xl bg-surface p-5 shadow-soft ring-1 ring-line sm:p-6", className)}>
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[0.9375rem] font-semibold text-fg">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-fg-muted">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={() => setShowTable((value) => !value)}
          aria-pressed={showTable}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-fg-muted outline-none hover:bg-surface-2 hover:text-fg focus-visible:ring-2 focus-visible:ring-ring"
        >
          {showTable ? <BarChart3 className="size-3.5" aria-hidden="true" /> : <Table2 className="size-3.5" aria-hidden="true" />}
          {showTable ? t("admin.chart.chart") : t("admin.chart.table")}
        </button>
      </header>
      <div className={cn("mt-4 transition-opacity", dimmed && "opacity-55")}>{showTable ? table : chart}</div>
    </section>
  );
}

/** A compact table of values for a chart's table view. */
export function ValueTable({ columns, rows }: { columns: string[]; rows: (string | number)[][] }) {
  return (
    <div className="scrollbar-thin max-h-64 overflow-y-auto rounded-xl ring-1 ring-line">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-surface-2 text-xs text-fg-muted">
          <tr>
            {columns.map((column, i) => (
              <th key={column} scope="col" className={cn("px-3 py-2 font-medium", i === 0 ? "text-start" : "text-end")}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={String(row[0])}>
              {row.map((cell, i) => (
                <td key={i} className={cn("px-3 py-1.5", i === 0 ? "text-fg-muted" : "text-end font-medium text-fg tabular-nums")}>
                  {typeof cell === "number" ? formatCount(cell) : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
