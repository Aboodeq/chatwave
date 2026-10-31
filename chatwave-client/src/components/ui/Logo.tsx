import { useId } from "react";
import { cn } from "../../lib/utils";

/** The ChatWave mark: a speech bubble carrying a wave. */
export function LogoMark({ className }: { className?: string }) {
  const gradientId = `cw-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={cn("size-8 shrink-0", className)}>
      <defs>
        <linearGradient id={gradientId} x1="4" y1="3" x2="28" y2="29" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2dd4bf" />
          <stop offset="0.55" stopColor="#0f7f7c" />
          <stop offset="1" stopColor="#0b4f6c" />
        </linearGradient>
      </defs>
      <path
        d="M16 3C8.82 3 3 8.37 3 15c0 3.1 1.27 5.92 3.36 8.05l-1.13 4.9a.8.8 0 0 0 1.1.91l5.17-2.3A14.1 14.1 0 0 0 16 27c7.18 0 13-5.37 13-12S23.18 3 16 3Z"
        fill={`url(#${gradientId})`}
      />
      <path
        d="M9.25 15.5c1.5-2.5 3-2.5 4.5 0s3 2.5 4.5 0 3-2.5 4.5 0"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-display text-[1.15rem] font-semibold tracking-tight text-fg">ChatWave</span>
    </span>
  );
}
