import { useEffect, type KeyboardEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CheckCheck, Moon, ShieldCheck, Smartphone, Sun } from "lucide-react";
import { useIsDark } from "../../hooks/useIsDark";
import { cn } from "../../lib/utils";
import { useUIStore } from "../../stores/uiStore";
import { IconButton } from "../ui/IconButton";
import { preloadPhoneField } from "../ui/phoneFieldLoader";
import { Logo } from "../ui/Logo";
import { WaveField, type WaveRider } from "./WaveField";
import { sendWave } from "./waveSignal";

interface AuthLayoutProps {
  children: ReactNode;
  /** The big line beside the form, e.g. <>Every word sends a <Accent>wave.</Accent></> */
  headline: ReactNode;
  intro: string;
}

/**
 * The sign-in pages: a living wave backdrop, an editorial headline and the form on a card.
 * Typing in the form sends ripples through the wave; submitting sends a bigger one.
 */
export function AuthLayout({ children, headline, intro }: AuthLayoutProps) {
  useEffect(preloadPhoneField, []);

  const onKeyDown = (event: KeyboardEvent) => {
    if (!event.repeat && (event.key.length === 1 || event.key === "Backspace")) sendWave(0.42);
  };

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-(--auth-bg) text-fg">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-[28%] -left-[12%] size-[70vw] max-w-[980px] rounded-full bg-[radial-gradient(closest-side,var(--auth-glow-a),transparent)]" />
        <div className="absolute -top-[18%] -right-[18%] size-[60vw] max-w-[860px] rounded-full bg-[radial-gradient(closest-side,var(--auth-glow-b),transparent)]" />
      </div>
      <WaveField className="absolute inset-x-0 bottom-0 -z-10 h-[62vh] min-h-[400px]" riders={riders} />

      <header className="flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-7 lg:px-12">
        <Link
          to="/login"
          aria-label="ChatWave, go to sign in"
          className="inline-flex rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Logo />
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto grid w-full max-w-[1280px] flex-1 items-start gap-8 px-5 pt-8 pb-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_460px] lg:gap-16 lg:px-12 lg:pt-[clamp(2rem,9vh,6rem)]">
        <section className="lg:pt-4">
          <p className="hidden items-center gap-2 rounded-full bg-surface/70 px-3 py-1 text-xs font-medium text-fg-muted ring-1 ring-line backdrop-blur sm:inline-flex">
            <span className="relative flex size-2" aria-hidden="true">
              <span className="absolute inline-flex size-full rounded-full bg-success/60 motion-safe:animate-ping" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            Messaging for teams
          </p>
          <p className="font-display text-[clamp(2.4rem,6vw,5.6rem)] leading-[0.94] font-semibold tracking-[-0.045em] text-balance text-fg sm:mt-6">
            {headline}
          </p>
          <p className="mt-5 hidden max-w-md text-lg leading-relaxed text-fg-muted sm:block">{intro}</p>
        </section>

        <div
          onKeyDown={onKeyDown}
          onSubmitCapture={() => sendWave(1.25)}
          className="relative w-full animate-rise rounded-[28px] bg-surface p-6 shadow-[0_1px_0_rgb(255_255_255/0.7)_inset,0_40px_90px_-30px_rgb(6_48_46/0.32),0_12px_24px_-12px_rgb(6_48_46/0.12)] ring-1 ring-black/[0.06] sm:p-9 lg:justify-self-end dark:shadow-[0_1px_0_rgb(255_255_255/0.06)_inset,0_40px_90px_-30px_rgb(0_0_0/0.8)] dark:ring-white/[0.08]"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent"
          />
          {children}
        </div>
      </main>

      <footer className="px-5 pb-5 sm:px-8 lg:px-12">
        <span className="rounded-full bg-(--auth-bg)/80 px-2.5 py-1 text-xs text-fg-subtle backdrop-blur-sm">
          © {new Date().getFullYear()} ChatWave
        </span>
      </footer>
    </div>
  );
}

/** The gradient word in a headline. */
export function Accent({ children }: { children: ReactNode }) {
  return (
    <span className="bg-[linear-gradient(100deg,#0d7471_0%,#14b8a6_50%,#0ea5e9_100%)] bg-clip-text pe-[0.06em] text-transparent dark:bg-[linear-gradient(100deg,#5eead4_0%,#2dd4bf_45%,#38bdf8_100%)]">
      {children}
    </span>
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
    <div className="mb-7">
      {children}
      <h1 className="font-display text-[1.75rem] leading-[1.15] font-semibold tracking-[-0.03em] text-fg sm:text-[2rem]">
        {title}
      </h1>
      {description && <p className="mt-2 text-[0.9375rem] leading-relaxed text-fg-muted">{description}</p>}
    </div>
  );
}

function ThemeToggle() {
  const dark = useIsDark();
  const setTheme = useUIStore((s) => s.setTheme);

  return (
    <IconButton
      icon={dark ? Sun : Moon}
      label={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="bg-surface/60 ring-1 ring-line backdrop-blur"
    />
  );
}

// Riders only show on wide, tall-enough screens, where they can't crowd the text.
const riderVisibility = "hidden lg:[@media(min-height:780px)]:flex";

const chip =
  "items-center gap-3 rounded-2xl bg-surface/90 py-2.5 ps-2.5 pe-4 shadow-[0_18px_40px_-18px_rgb(6_48_46/0.35)] ring-1 ring-line backdrop-blur-md dark:bg-surface/80 dark:shadow-[0_18px_40px_-18px_rgb(0_0_0/0.9)]";

/** Small moments from the product, floating on the wave (wide screens only). */
const riders: WaveRider[] = [
  {
    at: 0.1,
    depth: 0.3,
    children: (
      <div className={cn(riderVisibility, chip)}>
        <span className="grid size-9 place-items-center rounded-full bg-linear-to-br from-amber-200 to-orange-300 text-xs font-semibold text-orange-950">
          LH
        </span>
        <span>
          <span className="block text-[0.8125rem] leading-tight font-semibold text-fg">Lina Haddad</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-primary">
            typing
            <span className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-1 rounded-full bg-current motion-safe:animate-typing"
                  style={{ animationDelay: `${i * 160}ms` }}
                />
              ))}
            </span>
          </span>
        </span>
      </div>
    ),
  },
  {
    at: 0.31,
    depth: 0.15,
    children: (
      <div className={cn(riderVisibility, "flex-col items-end gap-1")}>
        <span className="rounded-[18px] rounded-ee-md bg-bubble-out px-4 py-2.5 text-sm font-medium text-bubble-out-fg shadow-[0_18px_40px_-18px_rgb(6_48_46/0.5)]">
          Release notes are live 🎉
        </span>
        <span className="flex items-center gap-1 rounded-full bg-surface/80 px-2 py-0.5 text-[0.6875rem] font-medium text-fg-muted ring-1 ring-line backdrop-blur">
          9:41 · Seen <CheckCheck className="size-3.5 text-primary" aria-hidden="true" />
        </span>
      </div>
    ),
  },
  {
    at: 0.47,
    depth: 0.36,
    children: (
      <div className={cn(riderVisibility, chip)}>
        <span className="grid size-9 place-items-center rounded-full bg-primary-soft text-primary-soft-fg">
          <Smartphone className="size-[1.125rem]" aria-hidden="true" />
        </span>
        <span>
          <span className="block text-[0.8125rem] leading-tight font-semibold text-fg tabular-nums">+962 7 ••• ••67</span>
          <span className="mt-0.5 flex items-center gap-1 text-xs font-medium text-success">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Number verified
          </span>
        </span>
      </div>
    ),
  },
];
