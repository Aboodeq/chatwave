import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../ui/Logo";
import { ThemeToggle } from "../ui/ThemeToggle";
import { AuthShowcase } from "./AuthShowcase";

interface AuthLayoutProps {
  children: ReactNode;
  /** Headline for the brand panel (desktop only). */
  title: ReactNode;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="flex min-h-dvh bg-surface">
      <div className="flex w-full flex-col px-5 py-5 sm:px-10 sm:py-8 lg:w-[46%] lg:max-w-[720px] lg:px-14 xl:px-20">
        <header className="flex items-center justify-between">
          <Link
            to="/login"
            aria-label="ChatWave, go to sign in"
            className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Logo />
          </Link>
          <ThemeToggle />
        </header>

        <main className="flex flex-1 items-start pt-12 pb-10 sm:items-center sm:py-14">
          <div className="mx-auto w-full max-w-[400px] animate-rise">{children}</div>
        </main>

        <footer className="text-xs text-fg-subtle">© {new Date().getFullYear()} ChatWave</footer>
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
      <h1 className="font-display text-[2rem] leading-tight font-semibold tracking-[-0.025em] text-fg">{title}</h1>
      {description && <p className="mt-2 text-[0.9375rem] leading-relaxed text-fg-muted">{description}</p>}
    </div>
  );
}
