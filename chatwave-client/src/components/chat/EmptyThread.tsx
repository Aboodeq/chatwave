import { SquarePen } from "lucide-react";
import { Button } from "../ui/Button";
import { LogoMark } from "../ui/Logo";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);
const kbd = "rounded-md border border-line-strong bg-surface px-1.5 py-0.5 font-sans text-[0.6875rem] font-medium text-fg-muted shadow-soft";

/** Shown beside the list on wide screens when no conversation is open. */
export function EmptyThread({ onNewChat }: { onNewChat: () => void }) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden p-8 text-center">
      <svg
        aria-hidden="true"
        viewBox="0 0 1200 400"
        preserveAspectRatio="none"
        fill="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 w-full text-line"
      >
        {Array.from({ length: 6 }, (_, i) => {
          const y = 120 + i * 44;
          return (
            <path
              key={i}
              d={`M0 ${y} C 200 ${y - 50}, 400 ${y + 50}, 600 ${y} S 1000 ${y - 50}, 1200 ${y}`}
              stroke="currentColor"
              strokeWidth="1.5"
            />
          );
        })}
      </svg>

      <span className="relative grid size-16 place-items-center rounded-2xl bg-surface shadow-pop ring-1 ring-line">
        <LogoMark className="size-9" />
      </span>
      <h1 className="relative mt-6 font-display text-2xl font-semibold tracking-tight">Pick up a conversation</h1>
      <p className="relative mt-2 max-w-sm text-[0.9375rem] leading-relaxed text-fg-muted">
        Choose a chat from the list, or start a new one with anyone on your team.
      </p>
      <Button className="relative mt-7" onClick={onNewChat}>
        <SquarePen className="size-4" aria-hidden="true" />
        New chat
      </Button>
      <p className="relative mt-4 text-xs text-fg-subtle">
        or press <kbd className={kbd}>{isMac ? "⌘" : "Ctrl"}</kbd> <kbd className={kbd}>K</kbd>
      </p>
    </div>
  );
}
