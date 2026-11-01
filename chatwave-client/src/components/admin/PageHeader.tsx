import type { ReactNode } from "react";

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 lg:mb-8">
      <div className="min-w-0">
        <h1 className="font-display text-[1.75rem] leading-tight font-semibold tracking-[-0.02em] text-fg">{title}</h1>
        {description && <p className="mt-1 text-[0.9375rem] text-fg-muted">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
