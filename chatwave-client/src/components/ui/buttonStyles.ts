import { cn } from "../../lib/utils";

export type Variant = "primary" | "secondary" | "ghost" | "danger";
export type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-fg hover:bg-primary-hover shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_1px_2px_rgb(15_26_34/0.1)]",
  secondary: "border border-line-strong bg-surface text-fg shadow-soft hover:bg-surface-2",
  ghost: "text-fg-muted hover:bg-surface-2 hover:text-fg",
  danger: "bg-danger text-white shadow-soft hover:bg-danger/90",
};

const sizes: Record<Size, string> = {
  sm: "h-8 gap-1.5 rounded-lg px-3 text-[0.8125rem]",
  md: "h-10 gap-2 rounded-xl px-4 text-sm",
  lg: "h-12 gap-2 rounded-xl px-5 text-[0.9375rem]",
};

/** Button styling, also usable on links (e.g. a router <Link>). */
export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(
    "inline-flex select-none items-center justify-center font-medium whitespace-nowrap",
    "transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:translate-y-px",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
    "disabled:pointer-events-none disabled:opacity-55",
    variants[variant],
    sizes[size],
    className,
  );
}
