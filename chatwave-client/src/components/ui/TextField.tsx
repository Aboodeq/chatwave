import { useId, type ComponentProps, type ReactNode } from "react";
import { CircleAlert, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

export interface TextFieldProps extends ComponentProps<"input"> {
  label: string;
  error?: string;
  hint?: ReactNode;
  icon?: LucideIcon;
  /** Shown at the end of the label row, e.g. a "Forgot password?" link. */
  labelAction?: ReactNode;
  /** Rendered inside the input, at the end (e.g. a show/hide button). */
  trailing?: ReactNode;
}

export function TextField({
  label,
  error,
  hint,
  icon: Icon,
  labelAction,
  trailing,
  id,
  className,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ");

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={inputId} className="text-sm font-medium text-fg">
          {label}
        </label>
        {labelAction}
      </div>
      <div className="relative">
        {Icon && (
          <Icon
            aria-hidden="true"
            className="pointer-events-none absolute start-3.5 top-1/2 size-[1.125rem] -translate-y-1/2 text-fg-subtle"
          />
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn(
            "h-12 w-full rounded-xl border border-line-strong bg-surface px-3.5 text-base text-fg shadow-soft",
            "placeholder:text-fg-subtle/80 outline-none transition-[border-color,box-shadow] duration-150",
            "hover:border-fg-subtle/50 focus:border-primary focus:ring-4 focus:ring-primary/15",
            "aria-invalid:border-danger aria-invalid:focus:ring-danger/15",
            "disabled:cursor-not-allowed disabled:opacity-60",
            Icon && "ps-10",
            trailing && "pe-12",
            className,
          )}
          {...props}
        />
        {trailing && <div className="absolute end-1 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
      {error ? (
        <p id={errorId} className="flex items-start gap-1.5 text-[0.8125rem] font-medium text-danger">
          <CircleAlert className="mt-[3px] size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : (
        hint && (
          <div id={hintId} className="text-[0.8125rem] text-fg-subtle">
            {hint}
          </div>
        )
      )}
    </div>
  );
}
