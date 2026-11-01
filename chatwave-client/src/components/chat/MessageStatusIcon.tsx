import { Check, CheckCheck, Clock3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";
import type { MessageStatus } from "../../types/message";

/**
 * Ticks for your own messages: one for sent, two for delivered, two in color for seen
 * (a clock while it's still on its way). The status is also spelled out for screen readers.
 */
export function MessageStatusIcon({
  status,
  className,
  onBubble = false,
}: {
  status: MessageStatus | "sending";
  className?: string;
  /** On the colored outgoing bubble, where gray and the seen color need different shades. */
  onBubble?: boolean;
}) {
  const { t } = useTranslation();
  const Icon = status === "sending" ? Clock3 : status === "sent" ? Check : CheckCheck;

  return (
    <span className={cn("inline-flex shrink-0", className)} title={t(`status.${status}`)}>
      <Icon
        aria-hidden="true"
        strokeWidth={status === "seen" ? 2.5 : 2.25}
        className={cn(
          "size-[0.9375rem] transition-colors duration-300",
          // On the teal bubble, "seen" needs a clearly blue tick next to the dimmer gray ones.
          status === "seen"
            ? onBubble
              ? "text-sky-300"
              : "text-sky-500 dark:text-sky-400"
            : onBubble
              ? "text-bubble-out-fg/60"
              : "text-fg-subtle",
        )}
      />
      <span className="sr-only">{t(`status.${status}`)}</span>
    </span>
  );
}
