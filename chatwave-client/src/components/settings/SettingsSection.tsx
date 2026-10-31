import type { ReactNode } from "react";

/** A titled block of settings on a card. */
export function SettingsSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="font-display text-lg font-semibold tracking-tight text-fg">
        {title}
      </h2>
      {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
      <div className="mt-4 rounded-2xl bg-surface p-5 shadow-soft ring-1 ring-line sm:p-6">{children}</div>
    </section>
  );
}
