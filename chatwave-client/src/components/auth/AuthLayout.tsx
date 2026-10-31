import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../ui/Logo";
import { AuthShowcase } from "./AuthShowcase";

interface AuthLayoutProps {
  children: ReactNode;
  /** Headline for the brand panel (desktop only). */
  title: ReactNode;
  subtitle: string;
}

/**
 * Logo, heading, form and footer share one left edge and start near the top, so the
 * content reads as a single column instead of floating in the middle of the screen.
 */
export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="flex min-h-dvh bg-surface">
      <div className="flex w-full flex-col px-6 sm:px-10 lg:w-1/2 xl:w-[46%]">
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col">
          <header className="pt-8 sm:pt-12">
            <Link
              to="/login"
              aria-label="ChatWave, go to sign in"
              className="inline-flex rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Logo />
            </Link>
          </header>

          <main className="flex-1 pt-[clamp(2.5rem,9vh,5.5rem)] pb-12">
            <div className="animate-rise">{children}</div>
          </main>

          <footer className="pb-8 text-xs text-fg-subtle sm:pb-12">© {new Date().getFullYear()} ChatWave</footer>
        </div>
      </div>

      <aside className="sticky top-0 hidden h-dvh flex-1 p-3 lg:block">
        <AuthShowcase title={title} subtitle={subtitle} />
      </aside>
    </div>
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
      <h1 className="font-display text-[1.875rem] leading-[1.15] font-semibold tracking-[-0.025em] text-fg sm:text-[2.25rem]">
        {title}
      </h1>
      {description && <p className="mt-3 text-base leading-relaxed text-fg-muted">{description}</p>}
    </div>
  );
}
