import { useRef, type KeyboardEvent } from "react";
import { Mail, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";
import type { ContactMethod } from "./contact";

const options = [
  { value: "email", icon: Mail },
  { value: "phone", icon: Smartphone },
] as const;

/**
 * A segmented control: email address or phone number. A radio group for assistive tech:
 * one tab stop, and the arrow keys switch between the two.
 */
export function MethodSwitch({
  value,
  onChange,
  label,
  className,
}: {
  value: ContactMethod;
  /** "keyboard" when chosen with the arrow keys: focus should stay on the switch. */
  onChange: (method: ContactMethod, source: "pointer" | "keyboard") => void;
  label: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const refs = useRef<Partial<Record<ContactMethod, HTMLButtonElement | null>>>({});

  const onKeyDown = (event: KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const next: ContactMethod = value === "email" ? "phone" : "email";
    onChange(next, "keyboard");
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn("relative grid grid-cols-2 rounded-[14px] bg-surface-2 p-1 ring-1 ring-line ring-inset", className)}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-1 start-1 w-[calc(50%-0.25rem)] rounded-[10px] bg-surface shadow-[0_1px_2px_rgb(15_26_34/0.08),0_2px_8px_-2px_rgb(15_26_34/0.1)] ring-1 ring-line",
          "transition-transform duration-300 ease-(--ease-out-expo) motion-reduce:transition-none",
          value === "phone" && "translate-x-full rtl:-translate-x-full",
        )}
      />
      {options.map(({ value: option, icon: Icon }) => (
        <button
          key={option}
          ref={(element) => {
            refs.current[option] = element;
          }}
          type="button"
          role="radio"
          aria-checked={value === option}
          tabIndex={value === option ? 0 : -1}
          onClick={() => value !== option && onChange(option, "pointer")}
          className={cn(
            "relative z-10 flex h-10 items-center justify-center gap-2 rounded-[10px] text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value === option ? "text-fg" : "text-fg-muted hover:text-fg",
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
          {t(`auth.methods.${option}`)}
        </button>
      ))}
    </div>
  );
}
