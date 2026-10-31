import { useId, type ReactNode } from "react";

/** One group of related settings on a settings page. */
export function SettingsCard({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      className="rounded-2xl bg-surface p-5 shadow-soft ring-1 ring-line sm:p-6"
    >
      {title && (
        <div className="mb-5">
          <h2 id={titleId} className="text-[0.9375rem] font-semibold text-fg">
            {title}
          </h2>
          {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}
