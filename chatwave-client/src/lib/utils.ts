import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMessageTime(date: string): string {
  return dayjs(date).format('HH:mm');
}

export function formatConversationTime(date: string): string {
  const d = dayjs(date);
  const now = dayjs();

  if (d.isSame(now, 'day')) return d.format('HH:mm');
  if (d.isSame(now.subtract(1, 'day'), 'day')) return 'Yesterday';
  if (d.isAfter(now.subtract(7, 'day'))) return d.format('dddd');
  return d.format('DD/MM/YYYY');
}

export function formatLastSeen(date: string | null): string {
  if (!date) return 'last seen a long time ago';
  return `last seen ${dayjs(date).fromNow()}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}