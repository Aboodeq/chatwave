import { useEffect, useRef, useState } from "react";

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat("en");

/** In full under 10,000 (1,284), compact above (12.9K). */
export function formatCount(value: number): string {
  return Math.abs(value) >= 10_000 ? compact.format(value) : full.format(value);
}

/** Clean, whole-number ticks from 0 that cover `max` in about `target` steps. */
export function niceTicks(max: number, target = 4): number[] {
  if (max <= 0) return [0, 1];
  const rough = max / target;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * power).find((s) => s >= rough) ?? 10 * power);
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
}

/** "2026-10-31" as a local calendar date (no time zone shift). */
export function parseDay(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDay(date: string, style: "axis" | "axis-weekday" | "long" = "axis"): string {
  const options: Intl.DateTimeFormatOptions =
    style === "long"
      ? { weekday: "short", month: "short", day: "numeric" }
      : style === "axis-weekday"
        ? { weekday: "short" }
        : { month: "short", day: "numeric" };
  return parseDay(date).toLocaleDateString("en-US", options);
}

/** Evenly spaced indexes for axis labels, always ending on the last point. */
export function labelIndexes(count: number, maxLabels: number): number[] {
  if (count <= 0) return [];
  const step = Math.max(1, Math.ceil(count / Math.max(1, maxLabels)));
  const indexes: number[] = [];
  for (let i = count - 1; i >= 0; i -= step) indexes.unshift(i);
  return indexes;
}

/** Width of an element, kept up to date. */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

/** Arrow keys move through the points; Home/End jump; Escape clears. */
export function stepThrough(key: string, current: number | null, count: number): number | null | undefined {
  if (count === 0) return undefined;
  const from = current ?? count - 1;
  switch (key) {
    case "ArrowLeft":
      return Math.max(0, from - (current === null ? 0 : 1));
    case "ArrowRight":
      return Math.min(count - 1, from + (current === null ? 0 : 1));
    case "Home":
      return 0;
    case "End":
      return count - 1;
    case "Escape":
      return null;
    default:
      return undefined;
  }
}
