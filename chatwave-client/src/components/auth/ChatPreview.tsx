import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn, formatTime } from "../../lib/utils";
import { MessageStatusIcon } from "../chat/MessageStatusIcon";
import type { MessageStatus } from "../../types/message";

/** When each step of the little story plays, in ms after the page appears. */
const TIMELINE = [500, 1300, 2300, 3500, 4300, 5900];

/**
 * A short, real-looking exchange that shows message status: a message arrives, your reply
 * goes from sent to delivered to seen, then the other person replies. Plays once; with
 * reduced motion it simply shows the end.
 */
export function ChatPreview({ className }: { className?: string }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? TIMELINE.length : 0,
  );

  useEffect(() => {
    if (step >= TIMELINE.length) return;
    const timers = TIMELINE.map((at, index) => window.setTimeout(() => setStep((current) => Math.max(current, index + 1)), at));
    return () => timers.forEach(window.clearTimeout);
    // Runs once: the timeline only moves forward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status: MessageStatus = step >= 4 ? "seen" : step >= 3 ? "delivered" : "sent";
  const now = new Date();
  const at = (minutesAgo: number) => formatTime(new Date(now.getTime() - minutesAgo * 60_000).toISOString());

  return (
    <figure
      aria-label={t("auth.intro.preview.label")}
      className={cn("rounded-3xl bg-white p-5 text-[#0e1a22] shadow-[0_30px_60px_-30px_rgb(0_0_0/0.5)] ring-1 ring-black/5", className)}
    >
      <div className="flex items-center gap-3 border-b border-[#e3e8ed] pb-4">
        <span className="relative grid size-10 place-items-center rounded-full bg-amber-100 text-sm font-semibold text-amber-900">
          {t("auth.intro.preview.contact").slice(0, 1)}
          <span className="absolute end-0 bottom-0 size-3 rounded-full border-2 border-white bg-emerald-500" />
        </span>
        <div>
          <p className="text-sm font-semibold">{t("auth.intro.preview.contact")}</p>
          <p className="text-xs font-medium text-emerald-600">{t("auth.intro.preview.online")}</p>
        </div>
      </div>

      <div className="flex min-h-[15.5rem] flex-col justify-end gap-2.5 pt-4" aria-hidden="true">
        {step >= 1 && (
          <Bubble side="in" time={at(4)}>
            {t("auth.intro.preview.incoming")}
          </Bubble>
        )}
        {step >= 2 && (
          <Bubble side="out" time={at(2)} status={status}>
            {t("auth.intro.preview.outgoing")}
          </Bubble>
        )}
        {step === 5 && (
          <div className="flex w-fit animate-rise items-center gap-1 rounded-2xl rounded-es-md bg-[#f0f3f6] px-3.5 py-3">
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-1.5 rounded-full bg-[#66737f] motion-safe:animate-typing" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        )}
        {step >= 6 && (
          <Bubble side="in" time={at(0)}>
            {t("auth.intro.preview.reply")}
          </Bubble>
        )}
      </div>

      {/* The status, spelled out, so the ticks explain themselves. */}
      <figcaption className="mt-4 flex items-center justify-end gap-1.5 text-xs font-medium text-[#4e5d6a]" aria-live="polite">
        {step >= 2 && (
          <>
            <MessageStatusIcon status={status} />
            <span key={status} className="animate-fade-in">
              {t(`status.${status}`)}
            </span>
          </>
        )}
      </figcaption>
    </figure>
  );
}

function Bubble({
  side,
  time,
  status,
  children,
}: {
  side: "in" | "out";
  time: string;
  status?: MessageStatus;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "max-w-[85%] animate-rise rounded-2xl px-3.5 py-2.5 text-[0.9375rem] leading-snug",
        side === "in" ? "rounded-es-md bg-[#f0f3f6] text-[#0e1a22]" : "ms-auto rounded-ee-md bg-[#0f7f7c] text-white",
      )}
    >
      <p>{children}</p>
      <p className={cn("mt-1 flex items-center justify-end gap-1 text-[0.6875rem]", side === "in" ? "text-[#66737f]" : "text-white/75")}>
        {time}
        {status && <MessageStatusIcon status={status} onBubble />}
      </p>
    </div>
  );
}
