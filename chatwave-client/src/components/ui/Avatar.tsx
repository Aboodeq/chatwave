import { useState } from "react";
import { cn, hashString, initials } from "../../lib/utils";

// Full class names so Tailwind can see them.
const palettes = [
  "bg-teal-100 text-teal-800 dark:bg-teal-400/15 dark:text-teal-200",
  "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-200",
  "bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-200",
  "bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-200",
  "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200",
  "bg-indigo-100 text-indigo-800 dark:bg-indigo-400/15 dark:text-indigo-200",
  "bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-200",
];

const sizes = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
  xl: "size-16 text-xl",
};

interface AvatarProps {
  name: string | null | undefined;
  src?: string | null;
  size?: keyof typeof sizes;
  online?: boolean | null;
  className?: string;
}

export function Avatar({ name, src, size = "md", online, className }: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const palette = palettes[hashString(name ?? "") % palettes.length];

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      {src && failedSrc !== src ? (
        <img
          src={src}
          alt=""
          onError={() => setFailedSrc(src)}
          className={cn("rounded-full object-cover", sizes[size])}
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn("grid place-items-center rounded-full font-semibold tracking-wide", sizes[size], palette)}
        >
          {initials(name)}
        </span>
      )}
      {online && (
        <span className="absolute end-0 bottom-0 size-3 rounded-full border-2 border-surface bg-success">
          <span className="sr-only">Online</span>
        </span>
      )}
    </span>
  );
}
