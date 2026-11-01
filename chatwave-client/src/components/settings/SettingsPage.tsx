import { Link } from "react-router-dom";
import { ArrowLeft, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SettingsCategory } from "./settingsCategories";

/** One settings category as its own page, next to the settings menu. */
export function SettingsPage({ category }: { category: SettingsCategory }) {
  const { t } = useTranslation();
  const { id, icon: Icon, page: Page } = category;

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-surface px-2 md:px-6 lg:px-8">
        <Link
          to="/settings"
          aria-label={t("settings.backToSettings")}
          className="grid size-10 shrink-0 place-items-center rounded-full text-fg-muted outline-none transition-colors hover:bg-surface-2 hover:text-fg focus-visible:ring-2 focus-visible:ring-ring md:hidden"
        >
          <ArrowLeft className="size-5 rtl:rotate-180" aria-hidden="true" />
        </Link>
        <span className="hidden size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-soft-fg md:grid">
          <Icon className="size-[1.125rem]" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[0.9375rem] font-semibold">{t(`settings.categories.${id}.title`)}</h1>
          <p className="truncate text-xs text-fg-muted">{t(`settings.categories.${id}.description`)}</p>
        </div>
      </header>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
        <div className="max-w-2xl space-y-6 px-4 py-6 md:px-6 md:py-8 lg:px-8">
          <Page />
        </div>
      </div>
    </>
  );
}

/** Wide screens, before a category is picked. */
export function SettingsHome() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <span className="grid size-16 place-items-center rounded-2xl bg-surface text-primary shadow-pop ring-1 ring-line">
        <Settings className="size-8" aria-hidden="true" />
      </span>
      <h2 className="mt-6 font-display text-2xl font-semibold tracking-tight">{t("settings.title")}</h2>
      <p className="mt-2 max-w-sm text-[0.9375rem] leading-relaxed text-fg-muted">{t("settings.homeBody")}</p>
    </div>
  );
}
