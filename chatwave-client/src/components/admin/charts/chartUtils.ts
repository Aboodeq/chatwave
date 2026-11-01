import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatLocale } from "../../../i18n";

const formats = new Map<string, Intl.NumberFormat>();

/** A cached number format for the app's language. */
function numberFormat(name: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const locale = formatLocale();
  const key = `${locale}|${name}`;
  let format = formats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(locale, options);
    formats.set(key, format);
  }
  return format;
}

/** In full under 10,000 (1,284), compact above (12.9K), in the app's digits. */
export function formatCount(value: number): string {
  return Math.abs(value) >= 10_000
    ? numberFormat("compact", { notation: "compact", maximumFractionDigits: 1 }).format(value)
    : numberFormat("full", {}).format(value);
}

/** 0.42 → "42%" (or "+42%" with a sign). */
export function formatPercent(fraction: number, signed = false): string {
  return signed
    ? numberFormat("percent-signed", { style: "percent", signDisplay: "exceptZero" }).format(fraction)
    : numberFormat("percent", { style: "percent" }).format(fraction);
}

/** 1536 → "1.5 KB". */
export function formatBytes(value: number | null): string {
  if (value === null) return "—";
  const [amount, unit] =
    value < 1024 ? [value, "byte"] : value < 1024 ** 2 ? [value / 1024, "kilobyte"] : [value / 1024 ** 2, "megabyte"];
  return numberFormat(`bytes-${unit}`, { style: "unit", unit, unitDisplay: "short", maximumFractionDigits: 1 }).format(amount);
}

/** Charts run right to left in Arabic, like the text: the newest day sits on the left. */
export function useIsRtl(): boolean {
  const { i18n } = useTranslation();
  return i18n.dir() === "rtl";
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
  return parseDay(date).toLocaleDateString(formatLocale(), options);
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

/**
 * Arrow keys move through the points (in the direction they're drawn); Home/End jump;
 * Escape clears.
 */
export function stepThrough(key: string, current: number | null, count: number, rtl = false): number | null | undefined {
  if (count === 0) return undefined;
  const from = current ?? count - 1;
  const earlier = rtl ? "ArrowRight" : "ArrowLeft";
  const later = rtl ? "ArrowLeft" : "ArrowRight";
  switch (key) {
    case earlier:
      return Math.max(0, from - (current === null ? 0 : 1));
    case later:
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
