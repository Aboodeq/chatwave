import type { ComponentProps } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

interface IconButtonProps extends Omit<ComponentProps<"button">, "children"> {
  icon: LucideIcon;
  /** Required: icon-only buttons need an accessible name. */
  label: string;
  size?: "sm" | "md";
}

export function IconButton({ icon: Icon, label, size = "md", className, type = "button", ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full text-fg-muted transition-colors",
        "hover:bg-surface-2 hover:text-fg disabled:pointer-events-none disabled:opacity-50",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring",
        size === "md" ? "size-10" : "size-8",
        className,
      )}
      {...props}
    >
      <Icon className={size === "md" ? "size-5" : "size-4"} aria-hidden="true" />
    </button>
  );
}
