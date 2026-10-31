import type { ComponentProps, ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "../../lib/utils";

interface CheckboxProps extends Omit<ComponentProps<"input">, "type"> {
  label: ReactNode;
}

export function Checkbox({ label, className, ...props }: CheckboxProps) {
  return (
    <label className={cn("group inline-flex cursor-pointer items-center gap-2.5 text-sm text-fg-muted", className)}>
      <span className="relative grid size-[1.125rem] shrink-0 place-items-center">
        <input
          type="checkbox"
          className={cn(
            "peer size-full cursor-pointer appearance-none rounded-[5px] border border-line-strong bg-surface shadow-soft transition-colors",
            "checked:border-primary checked:bg-primary group-hover:border-fg-subtle/60 checked:group-hover:border-primary",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
          )}
          {...props}
        />
        <Check
          aria-hidden="true"
          strokeWidth={3}
          className="pointer-events-none absolute size-3 scale-50 text-primary-fg opacity-0 transition peer-checked:scale-100 peer-checked:opacity-100"
        />
      </span>
      <span className="select-none">{label}</span>
    </label>
  );
}
