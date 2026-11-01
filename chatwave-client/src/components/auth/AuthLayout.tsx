import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCheck, Languages, Smartphone } from "lucide-react";
import { LanguageToggle } from "../ui/LanguageToggle";
import { Logo } from "../ui/Logo";
import { ThemeToggle } from "../ui/ThemeToggle";
import { preloadPhoneField } from "../ui/phoneFieldLoader";
import { ChatPreview } from "./ChatPreview";

/**
 * The sign-in pages: an introduction on one side, and the form filling its own section on
 * the other (they swap sides in Arabic). Light by design: no canvas or heavy effects, just
 * a staggered entrance and a short animated preview of message status.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  useEffect(preloadPhoneField, []);

  return (
    <div className="min-h-dvh bg-surface lg:grid lg:grid-cols-[minmax(0,1fr)_32rem] xl:grid-cols-[minmax(0,1fr)_36rem]">
      <Intro />

      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center justify-between gap-3 px-6 pt-6 sm:px-10 lg:px-12 lg:pt-8">
          <Link
            to="/login"
            aria-label={t("common.appName")}
            className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring lg:invisible"
          >
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex flex-1 items-center px-6 py-10 sm:px-10 lg:px-12">
          <div className="stagger-rise mx-auto w-full max-w-md lg:max-w-none">{children}</div>
        </main>

        <footer className="px-6 pb-6 text-xs text-fg-subtle sm:px-10 lg:px-12">
          {/* A brand line: reads "© 2026 ChatWave" in every language. */}
          <span dir="ltr">{t("common.copyright", { year: new Date().getFullYear() })}</span>
        </footer>
      </div>
    </div>
  );
}

const features = [
  { key: "status", icon: CheckCheck },
  { key: "phone", icon: Smartphone },
  { key: "languages", icon: Languages },
] as const;

/** Wide screens: what ChatWave is, with a live-looking example of message status. */
function Intro() {
  const { t } = useTranslation();

  return (
    <aside className="relative hidden min-h-dvh flex-col justify-between overflow-hidden bg-[#093a38] px-12 py-10 text-white lg:flex xl:px-16 xl:py-12">
      {/* A soft light from one corner; otherwise a flat brand color. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_55%_at_0%_0%,rgb(45_212_191/0.22),transparent_70%)] rtl:bg-[radial-gradient(70%_55%_at_100%_0%,rgb(45_212_191/0.22),transparent_70%)]"
      />

      <Link to="/login" aria-label={t("common.appName")} className="relative w-fit rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-white/60">
        <Logo inverted />
      </Link>

      <div className="stagger-rise relative grid items-center gap-12 py-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/85 ring-1 ring-white/15">
            <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
            {t("auth.intro.eyebrow")}
          </p>
          <h2 className="mt-6 font-display text-[clamp(2.25rem,3.2vw,3.25rem)] leading-[1.08] font-semibold tracking-[-0.03em] text-balance">
            {t("auth.intro.headline")}
          </h2>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/75">{t("auth.intro.body")}</p>
        </div>
        <ChatPreview className="w-full max-w-sm xl:max-w-none" />
      </div>

      <ul className="stagger-rise relative grid gap-4 border-t border-white/10 pt-8 xl:grid-cols-3">
        {features.map(({ key, icon: Icon }) => (
          <li key={key} className="flex items-center gap-3 text-sm text-white/80">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 text-emerald-300 ring-1 ring-white/10">
              <Icon className="size-[1.125rem]" aria-hidden="true" />
            </span>
            {t(`auth.intro.features.${key}`)}
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function AuthHeading({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-8">
      {children}
      <h1 className="font-display text-[2rem] leading-[1.15] font-semibold tracking-[-0.03em] text-fg">{title}</h1>
      {description && <p className="mt-2 text-[0.9375rem] leading-relaxed text-fg-muted">{description}</p>}
    </div>
  );
}
