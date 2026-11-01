import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import dayjs from "dayjs";
import i18n, { formatLocale } from "../i18n";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Formatters {
  time: Intl.DateTimeFormat;
  weekday: Intl.DateTimeFormat;
  longWeekday: Intl.DateTimeFormat;
  shortDate: Intl.DateTimeFormat;
  fullDate: Intl.DateTimeFormat;
  relative: Intl.RelativeTimeFormat;
  number: Intl.NumberFormat;
  twoDigits: Intl.NumberFormat;
}

const formatterCache = new Map<string, Formatters>();

function formatters(): Formatters {
  const locale = formatLocale();
  let cached = formatterCache.get(locale);
  if (!cached) {
    cached = {
      time: new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }),
      weekday: new Intl.DateTimeFormat(locale, { weekday: "short" }),
      longWeekday: new Intl.DateTimeFormat(locale, { weekday: "long" }),
      shortDate: new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }),
      fullDate: new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }),
      relative: new Intl.RelativeTimeFormat(locale, { numeric: "auto" }),
      number: new Intl.NumberFormat(locale),
      twoDigits: new Intl.NumberFormat(locale, { minimumIntegerDigits: 2 }),
    };
    formatterCache.set(locale, cached);
  }
  return cached;
}

/** "1,284", with the digits and separators of the app's language and region. */
export function formatNumber(value: number): string {
  return formatters().number.format(value);
}

/** A countdown, "0:59" (in the language's digits). */
export function formatCountdown(seconds: number): string {
  const f = formatters();
  return `${f.number.format(Math.floor(seconds / 60))}:${f.twoDigits.format(seconds % 60)}`;
}

/** "9:41 AM" (or "09:41", depending on the language and region). */
export function formatTime(date: string): string {
  return formatters().time.format(new Date(date));
}

/** Compact timestamp for the conversation list. */
export function formatListTime(date: string): string {
  const d = dayjs(date);
  const now = dayjs();
  if (d.isSame(now, "day")) return formatTime(date);
  if (d.isSame(now.subtract(1, "day"), "day")) return i18n.t("time.yesterday");
  if (d.isAfter(now.subtract(6, "day"))) return formatters().weekday.format(d.toDate());
  if (d.isSame(now, "year")) return formatters().shortDate.format(d.toDate());
  return formatters().fullDate.format(d.toDate());
}

/** Label for the separators between days in a conversation. */
export function formatDayLabel(date: string): string {
  const d = dayjs(date);
  const now = dayjs();
  if (d.isSame(now, "day")) return i18n.t("time.today");
  if (d.isSame(now.subtract(1, "day"), "day")) return i18n.t("time.yesterday");
  if (d.isAfter(now.subtract(6, "day"))) return formatters().longWeekday.format(d.toDate());
  if (d.isSame(now, "year")) return formatters().shortDate.format(d.toDate());
  return formatters().fullDate.format(d.toDate());
}

export type MomentKind = "lastSeen" | "lastActive" | "joined" | "plain";

/**
 * A moment as a sentence, e.g. "Last seen 5 minutes ago", "Joined yesterday at 9:14 PM",
 * "Last active Monday". The sentence comes from the translations ("time.<kind>"), so word
 * order is right in every language.
 */
export function formatMoment(date: string, now: number = Date.now(), kind: MomentKind = "lastSeen"): string {
  const seen = dayjs(date);
  const current = dayjs(now);
  const minutes = Math.round(seen.diff(current, "minute", true));
  const f = formatters();

  if (minutes > -1) return i18n.t(`time.${kind}.justNow`);
  if (minutes > -60) return i18n.t(`time.${kind}.relative`, { relative: f.relative.format(minutes, "minute") });
  if (seen.isSame(current, "day")) return i18n.t(`time.${kind}.today`, { time: formatTime(date) });
  if (seen.isSame(current.subtract(1, "day"), "day")) return i18n.t(`time.${kind}.yesterday`, { time: formatTime(date) });
  if (seen.isAfter(current.subtract(6, "day"))) return i18n.t(`time.${kind}.day`, { day: f.longWeekday.format(seen.toDate()) });
  const formatted = (seen.isSame(current, "year") ? f.shortDate : f.fullDate).format(seen.toDate());
  return i18n.t(`time.${kind}.date`, { date: formatted });
}

/** "Oct 31" this year, "Oct 31, 2025" otherwise. */
export function formatShortDate(date: string): string {
  const d = dayjs(date);
  return (d.isSame(dayjs(), "year") ? formatters().shortDate : formatters().fullDate).format(d.toDate());
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = Array.from(parts[0])[0] ?? "";
  const last = parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** Stable small integer for a string, used to pick avatar colors. */
export function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Random id that works outside secure contexts too (crypto.randomUUID needs HTTPS). */
export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

/** "Ctrl+K", or "⌘K" on a Mac. */
export function shortcutLabel(key: string): string {
  return isMac ? `⌘${key}` : `Ctrl+${key}`;
}

export const isTouchDevice = () =>
  typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
