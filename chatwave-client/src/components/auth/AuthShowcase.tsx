import type { ReactNode } from "react";
import { CheckCheck, MessagesSquare, Reply } from "lucide-react";
import { cn } from "../../lib/utils";

const features = [
  { icon: MessagesSquare, title: "One-to-one chats", text: "Message anyone on your team." },
  { icon: Reply, title: "Reply, edit, delete", text: "Keep context without clutter." },
  { icon: CheckCheck, title: "Never lose your place", text: "Unread counts stay in sync." },
];

/**
 * The brand panel beside the auth forms: a light, live-feeling preview of a conversation,
 * drawn with the same colors as the real chat.
 */
export function AuthShowcase({ title, subtitle }: { title: ReactNode; subtitle: string }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[28px] bg-linear-to-br from-[#f3fbfa] via-[#e7f6f4] to-[#d6efec] p-10 ring-1 ring-brand-100 xl:p-14 dark:from-[#06191c] dark:via-[#071f22] dark:to-[#0a2a2e] dark:ring-white/[0.06]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -end-40 -top-48 size-[620px] rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.95),transparent)] dark:bg-[radial-gradient(closest-side,rgb(45_212_191/0.22),transparent)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -start-40 -bottom-56 size-[680px] rounded-full bg-[radial-gradient(closest-side,rgb(45_212_191/0.2),transparent)] dark:bg-[radial-gradient(closest-side,rgb(14_116_144/0.45),transparent)]"
      />
      <Waves />

      <div className="relative">
        <p className="inline-flex items-center gap-2 rounded-full bg-surface/80 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-200 backdrop-blur dark:text-brand-200 dark:ring-white/10">
          <span className="size-1.5 rounded-full bg-brand-500" aria-hidden="true" />
          ChatWave for teams
        </p>
        <h2 className="mt-6 max-w-md font-display text-[2.75rem] leading-[1.04] font-semibold tracking-[-0.03em] text-balance text-fg xl:text-[3.25rem]">
          {title}
        </h2>
        <p className="mt-4 max-w-sm text-base leading-relaxed text-fg-muted">{subtitle}</p>
      </div>

      <div className="relative mt-[clamp(2rem,6vh,3.5rem)]">
        <ChatPreview />
      </div>

      <ul className="relative mt-auto grid gap-5 border-t border-brand-200/70 pt-8 xl:grid-cols-3 dark:border-white/10 [@media(max-height:820px)]:hidden">
        {features.map(({ icon: Icon, title: featureTitle, text }) => (
          <li key={featureTitle} className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface text-primary shadow-soft ring-1 ring-line">
              <Icon className="size-[1.125rem]" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium text-fg">{featureTitle}</p>
              <p className="mt-0.5 text-[0.8125rem] leading-snug text-fg-muted">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChatPreview() {
  return (
    <div
      aria-hidden="true"
      className="w-full max-w-[440px] rounded-[26px] bg-surface/90 p-4 shadow-[0_28px_70px_-24px_rgb(12_80_78/0.38)] ring-1 ring-line backdrop-blur-xl"
    >
      <div className="flex items-center gap-3 border-b border-line px-1 pb-3.5">
        <span className="grid size-9 place-items-center rounded-full bg-brand-100 text-[0.8125rem] font-semibold text-brand-800 dark:bg-brand-400/15 dark:text-brand-200">
          MO
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-fg">Maya Okafor</p>
          <p className="text-xs text-fg-subtle">Product design</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-4 text-[0.875rem] leading-snug">
        <Bubble side="in" delay={0.3} time="9:14 AM">
          Morning! Did the new onboarding build go out?
        </Bubble>
        <Bubble side="out" delay={1.1} time="9:15 AM">
          Shipped at 9:02. Release notes are in the channel.
        </Bubble>
        <Bubble side="in" delay={1.9} time="9:16 AM" quote="Shipped at 9:02. Release notes are in the…">
          Amazing. The welcome screen feels so much calmer.
        </Bubble>
        <div
          className="flex w-fit animate-rise items-center gap-1 rounded-2xl rounded-es-md bg-surface-2 px-3.5 py-3"
          style={{ animationDelay: "2.8s" }}
        >
          {[0, 0.15, 0.3].map((d) => (
            <span
              key={d}
              className="size-1.5 animate-typing rounded-full bg-fg-subtle"
              style={{ animationDelay: `${d}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Bubble({
  side,
  delay,
  time,
  quote,
  children,
}: {
  side: "in" | "out";
  delay: number;
  time: string;
  quote?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "max-w-[82%] animate-rise rounded-2xl px-3.5 py-2",
        side === "in"
          ? "self-start rounded-es-md bg-surface-2 text-fg"
          : "self-end rounded-ee-md bg-bubble-out text-bubble-out-fg",
      )}
      style={{ animationDelay: `${delay}s` }}
    >
      {quote && (
        <div className="mb-1.5 rounded-lg border-s-2 border-primary bg-surface px-2.5 py-1.5 text-[0.8125rem]">
          <p className="font-medium text-primary">You</p>
          <p className="truncate text-fg-muted">{quote}</p>
        </div>
      )}
      <p>
        {children}
        <span
          className={cn(
            "float-end ms-3 mt-[0.35rem] text-[0.6875rem] leading-none",
            side === "in" ? "text-fg-subtle" : "text-bubble-out-fg/70",
          )}
        >
          {time}
        </span>
      </p>
    </div>
  );
}

function Waves() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1200 400"
      preserveAspectRatio="none"
      fill="none"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 w-full text-brand-600/[0.13] dark:text-teal-100/[0.07]"
    >
      {Array.from({ length: 8 }, (_, i) => {
        const y = 110 + i * 36;
        return (
          <path
            key={i}
            d={`M0 ${y} C 200 ${y - 55}, 400 ${y + 55}, 600 ${y} S 1000 ${y - 55}, 1200 ${y}`}
            stroke="currentColor"
            strokeWidth="1.5"
          />
        );
      })}
    </svg>
  );
}
