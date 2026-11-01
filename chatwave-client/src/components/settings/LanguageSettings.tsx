import { RadioGroup } from "radix-ui";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../hooks/useLanguage";
import { LANGUAGES, type Language } from "../../i18n/languages";
import { cn } from "../../lib/utils";
import { SettingsCard } from "./SettingsCard";

/** A line in each language, shown in its own script and direction. */
const samples: Record<Language, string> = {
  en: "Hi! The slides are ready.",
  ar: "مرحبًا! العرض جاهز.",
};

/** Settings › Language: English or Arabic. Saved to the account, so emails and texts match. */
export function LanguageSettings() {
  const { t } = useTranslation();
  const { language, changeLanguage } = useLanguage();

  return (
    <SettingsCard title={t("settings.language.title")} description={t("settings.language.description")}>
      <RadioGroup.Root
        value={language}
        onValueChange={(value) => void changeLanguage(value as Language)}
        aria-label={t("settings.language.title")}
        className="grid gap-3 sm:grid-cols-2"
      >
        {(Object.keys(LANGUAGES) as Language[]).map((code) => (
          <RadioGroup.Item
            key={code}
            value={code}
            className={cn(
              "group rounded-xl p-2 text-start ring-1 ring-line transition outline-none",
              "hover:ring-line-strong focus-visible:ring-2 focus-visible:ring-ring",
              "data-[state=checked]:ring-2 data-[state=checked]:ring-primary",
            )}
          >
            {/* A message bubble in that language, laid out the way it reads. */}
            <span
              aria-hidden="true"
              dir={LANGUAGES[code].dir}
              lang={code}
              className="flex h-16 items-end rounded-lg bg-surface-2 p-2.5"
            >
              <span className="max-w-full truncate rounded-2xl rounded-ee-md bg-bubble-out px-3 py-1.5 text-sm text-bubble-out-fg ms-auto">
                {samples[code]}
              </span>
            </span>
            <span className="mt-2 flex items-center justify-between gap-2 px-1">
              <span>
                <span lang={code} className="block text-sm font-medium text-fg">
                  {LANGUAGES[code].name}
                </span>
                <span className="block text-xs text-fg-subtle">{t(`settings.language.${LANGUAGES[code].dir}`)}</span>
              </span>
              <Check className="size-4 shrink-0 text-primary opacity-0 group-data-[state=checked]:opacity-100" aria-hidden="true" />
            </span>
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
    </SettingsCard>
  );
}
