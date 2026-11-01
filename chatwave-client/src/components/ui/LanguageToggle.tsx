import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../hooks/useLanguage";
import { LANGUAGES } from "../../i18n/languages";
import { cn } from "../../lib/utils";

/**
 * Switches between English and العربية (shows the language you'd switch to). `compact`
 * shows a short label ("EN" or "ع") for tight spaces like a phone's top bar.
 */
export function LanguageToggle({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { t } = useTranslation();
  const { language, changeLanguage } = useLanguage();
  const next = language === "ar" ? "en" : "ar";

  return (
    <button
      type="button"
      onClick={() => void changeLanguage(next)}
      aria-label={t("language.switchTo")}
      title={LANGUAGES[next].name}
      lang={next}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-medium text-fg-muted ring-1 ring-line transition-colors outline-none hover:bg-surface-2 hover:text-fg focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <Languages className="size-4" aria-hidden="true" />
      {compact ? <span className="text-xs font-semibold">{next === "ar" ? "ع" : "EN"}</span> : LANGUAGES[next].name}
    </button>
  );
}
