import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import dayjs from "dayjs";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const longWeekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: "long" });
const shortDateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const fullDateFormat = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

/** "9:41 AM" (or "09:41", depending on the user's locale). */
export function formatTime(date: string): string {
  return timeFormat.format(new Date(date));
}

/** Compact timestamp for the conversation list. */
export function formatListTime(date: string): string {
  const d = dayjs(date);
  const now = dayjs();
  if (d.isSame(now, "day")) return formatTime(date);
  if (d.isSame(now.subtract(1, "day"), "day")) return "Yesterday";
  if (d.isAfter(now.subtract(6, "day"))) return weekdayFormat.format(d.toDate());
  if (d.isSame(now, "year")) return shortDateFormat.format(d.toDate());
  return fullDateFormat.format(d.toDate());
}

/** Label for the separators between days in a conversation. */
export function formatDayLabel(date: string): string {
  const d = dayjs(date);
  const now = dayjs();
  if (d.isSame(now, "day")) return "Today";
  if (d.isSame(now.subtract(1, "day"), "day")) return "Yesterday";
  if (d.isAfter(now.subtract(6, "day"))) return longWeekdayFormat.format(d.toDate());
  if (d.isSame(now, "year")) return shortDateFormat.format(d.toDate());
  return fullDateFormat.format(d.toDate());
}

/** "Last seen 5 minutes ago", "Last seen yesterday at 9:14 PM", "Last seen Monday"… */
export function formatLastSeen(date: string, now: number = Date.now(), label = "Last seen"): string {
  const seen = dayjs(date);
  const current = dayjs(now);
  const minutes = Math.round(seen.diff(current, "minute", true));

  if (minutes > -1) return `${label} just now`;
  if (minutes > -60) return `${label} ${relativeFormat.format(minutes, "minute")}`;
  if (seen.isSame(current, "day")) return `${label} today at ${formatTime(date)}`;
  if (seen.isSame(current.subtract(1, "day"), "day")) return `${label} yesterday at ${formatTime(date)}`;
  if (seen.isAfter(current.subtract(6, "day"))) return `${label} ${longWeekdayFormat.format(seen.toDate())}`;
  if (seen.isSame(current, "year")) return `${label} ${shortDateFormat.format(seen.toDate())}`;
  return `${label} ${fullDateFormat.format(seen.toDate())}`;
}

/** "Oct 31" this year, "Oct 31, 2025" otherwise. */
export function formatShortDate(date: string): string {
  const d = dayjs(date);
  return (d.isSame(dayjs(), "year") ? shortDateFormat : fullDateFormat).format(d.toDate());
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

export const isTouchDevice = () =>
  typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
