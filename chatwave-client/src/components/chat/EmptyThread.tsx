import { SquarePen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";
import { LogoMark } from "../ui/Logo";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);
const kbd = "rounded-md border border-line-strong bg-surface px-1.5 py-0.5 font-sans text-[0.6875rem] font-medium text-fg-muted shadow-soft";

/** Shown beside the list on wide screens when no conversation is open. */
export function EmptyThread({ onNewChat }: { onNewChat: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="stagger-rise flex flex-1 flex-col items-center justify-center p-8 text-center">
      <span className="grid size-16 place-items-center rounded-2xl bg-surface shadow-pop ring-1 ring-line">
        <LogoMark className="size-9" />
      </span>
      <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight">{t("chat.empty.title")}</h1>
      <p className="mt-2 max-w-sm text-[0.9375rem] leading-relaxed text-fg-muted">{t("chat.empty.body")}</p>
      <div>
        <Button className="mt-7" onClick={onNewChat}>
          <SquarePen className="size-4" aria-hidden="true" />
          {t("chat.empty.newChat")}
        </Button>
      </div>
      <p className="mt-4 text-xs text-fg-subtle">
        {t("chat.empty.orPress")}{" "}
        <span dir="ltr" className="inline-flex gap-1">
          <kbd className={kbd}>{isMac ? "⌘" : "Ctrl"}</kbd>
          <kbd className={kbd}>K</kbd>
        </span>
      </p>
    </div>
  );
}
