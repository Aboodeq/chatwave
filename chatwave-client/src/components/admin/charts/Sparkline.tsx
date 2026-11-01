/** A small trend for a stat tile: context in quiet gray, the latest point in the accent. */
export function Sparkline({ values, width = 112, height = 36 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const pad = 4;
  const x = (i: number) => pad + (i / (values.length - 1)) * (width - pad * 2);
  const y = (value: number) => height - pad - (value / max) * (height - pad * 2);
  const path = values.map((value, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(value).toFixed(1)}`).join("");
  const last = values.length - 1;

  return (
    <svg width={width} height={height} aria-hidden="true" className="shrink-0 overflow-visible rtl:-scale-x-100">
      <path d={path} fill="none" className="stroke-viz-muted" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <path
        d={`M${x(last - 1).toFixed(1)},${y(values[last - 1]).toFixed(1)}L${x(last).toFixed(1)},${y(values[last]).toFixed(1)}`}
        fill="none"
        className="stroke-viz-1"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <circle cx={x(last)} cy={y(values[last])} r={3.5} className="fill-viz-1 stroke-surface" strokeWidth={2} />
    </svg>
  );
}
