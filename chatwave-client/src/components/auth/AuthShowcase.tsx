import type { ReactNode } from "react";
import { CheckCheck, MessagesSquare, Reply } from "lucide-react";
import { cn } from "../../lib/utils";

const features = [
  { icon: MessagesSquare, title: "One-to-one chats", text: "Message anyone on your team." },
  { icon: Reply, title: "Reply, edit, delete", text: "Keep context without clutter." },
  { icon: CheckCheck, title: "Never lose your place", text: "Unread counts stay in sync." },
];

/** The brand panel beside the auth forms: a live-feeling preview of a conversation. */
export function AuthShowcase({ title, subtitle }: { title: ReactNode; subtitle: string }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[28px] bg-[#04181b] p-10 text-white ring-1 ring-white/[0.06] xl:p-14">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -end-32 -top-40 size-[560px] rounded-full bg-[radial-gradient(closest-side,rgb(45_212_191/0.3),transparent)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -start-40 -bottom-56 size-[680px] rounded-full bg-[radial-gradient(closest-side,rgb(14_116_144/0.5),transparent)]"
      />
      <Waves />

      <div className="relative">
        <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-medium text-teal-200">
          <span className="size-1.5 rounded-full bg-teal-300" aria-hidden="true" />
          ChatWave for teams
        </p>
        <h2 className="mt-6 max-w-md font-display text-[2.75rem] leading-[1.04] font-semibold tracking-[-0.03em] text-balance xl:text-[3.25rem]">
          {title}
        </h2>
        <p className="mt-4 max-w-sm text-[0.9375rem] leading-relaxed text-white/65">{subtitle}</p>
      </div>

      <div className="relative my-auto py-10">
        <ChatPreview />
      </div>

      <ul className="relative grid gap-5 border-t border-white/10 pt-8 xl:grid-cols-3 [@media(max-height:820px)]:hidden">
        {features.map(({ icon: Icon, title: featureTitle, text }) => (
          <li key={featureTitle} className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/[0.07] text-teal-200 ring-1 ring-white/10">
              <Icon className="size-[1.125rem]" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium">{featureTitle}</p>
              <p className="mt-0.5 text-[0.8125rem] leading-snug text-white/55">{text}</p>
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
      className="mx-auto w-full max-w-[420px] rounded-[26px] border border-white/10 bg-white/[0.055] p-4 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.6)] backdrop-blur-xl"
    >
      <div className="flex items-center gap-3 border-b border-white/[0.08] px-1 pb-3.5">
        <span className="grid size-9 place-items-center rounded-full bg-brand-300 text-[0.8125rem] font-semibold text-brand-950">
          MO
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Maya Okafor</p>
          <p className="text-xs text-white/50">Product design</p>
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
          className="flex w-fit animate-rise items-center gap-1 rounded-2xl rounded-es-md bg-white/[0.09] px-3.5 py-3"
          style={{ animationDelay: "2.8s" }}
        >
          {[0, 0.15, 0.3].map((d) => (
            <span
              key={d}
              className="size-1.5 animate-typing rounded-full bg-white/80"
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
          ? "self-start rounded-es-md bg-white/[0.09] text-white"
          : "self-end rounded-ee-md bg-brand-300 text-brand-950",
      )}
      style={{ animationDelay: `${delay}s` }}
    >
      {quote && (
        <div className="mb-1.5 rounded-lg border-s-2 border-brand-300 bg-white/[0.06] px-2.5 py-1.5 text-[0.8125rem]">
          <p className="font-medium text-brand-200">You</p>
          <p className="truncate text-white/60">{quote}</p>
        </div>
      )}
      <p>
        {children}
        <span className={cn("ms-2 inline-block text-[0.6875rem]", side === "in" ? "text-white/45" : "text-brand-950/55")}>
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
      className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 w-full text-teal-100/[0.07]"
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
