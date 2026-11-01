import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Called once all digits are filled in. */
  onComplete?: (value: string) => void;
  length?: number;
  invalid?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  describedBy?: string;
}

/**
 * One box per digit. Typing moves forward, Backspace moves back, arrow keys navigate, and
 * pasting (or the phone's one-time-code autofill) fills every box at once.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  invalid = false,
  disabled = false,
  autoFocus = false,
  describedBy,
}: OtpInputProps) {
  const { t } = useTranslation();
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const focus = (index: number) => {
    const input = refs.current[Math.max(0, Math.min(length - 1, index))];
    input?.focus();
    input?.select();
  };

  const commit = (next: string[]) => {
    const joined = next.join("").slice(0, length);
    onChange(joined);
    if (joined.length === length && !next.includes("")) onComplete?.(joined);
  };

  const fillFrom = (index: number, text: string) => {
    const incoming = text.replace(/\D/g, "").split("");
    if (incoming.length === 0) return;
    const next = [...digits];
    incoming.slice(0, length - index).forEach((digit, offset) => {
      next[index + offset] = digit;
    });
    commit(next);
    focus(Math.min(index + incoming.length, length - 1));
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      const next = [...digits];
      next[index - 1] = "";
      commit(next);
      focus(index - 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focus(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focus(index + 1);
    }
  };

  const handlePaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    fillFrom(index, event.clipboardData.getData("text"));
  };

  return (
    <div
      role="group"
      aria-label={t("auth.code.label")}
      dir="ltr"
      aria-describedby={describedBy}
      className={cn("flex gap-2 sm:gap-2.5", invalid && "animate-shake")}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          value={digit}
          onChange={(event) => {
            let text = event.target.value;
            // Typing into a filled box with the caret beside the digit gives "old+new".
            if (text.length === 2 && digit) {
              text = text.startsWith(digit) ? text.slice(1) : text.endsWith(digit) ? text.slice(0, 1) : text;
            }
            if (text.length > 1) {
              fillFrom(index, text);
              return;
            }
            if (text !== "" && !/^\d$/.test(text)) return;
            const next = [...digits];
            next[index] = text;
            commit(next);
            if (text) focus(index + 1);
          }}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={(event) => handlePaste(index, event)}
          onFocus={(event) => event.target.select()}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          pattern="[0-9]*"
          maxLength={length}
          disabled={disabled}
          aria-label={t("auth.code.digit", { n: index + 1, total: length })}
          aria-invalid={invalid || undefined}
          className={cn(
            "h-14 w-full min-w-0 rounded-xl border border-line-strong bg-surface text-center font-display text-2xl font-semibold text-fg shadow-soft",
            "outline-none transition-[border-color,box-shadow] duration-150 caret-primary",
            "focus:border-primary focus:ring-4 focus:ring-primary/15",
            digit && "border-fg-subtle/60",
            invalid && "border-danger focus:border-danger focus:ring-danger/15",
            "disabled:opacity-60",
          )}
        />
      ))}
    </div>
  );
}
