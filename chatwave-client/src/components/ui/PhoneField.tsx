import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode, type Ref } from "react";
import { isSupportedCountry } from "libphonenumber-js/min";
import { Popover } from "radix-ui";
import { Check, ChevronDown, CircleAlert, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  examplePhone,
  formatInternationalAsYouType,
  formatPhoneInput,
  getCountry,
  getCountryList,
  splitInternational,
  type Country,
  type CountryCode,
} from "../../lib/phone";
import { rememberCountry } from "../../lib/phoneCountry";
import { cn } from "../../lib/utils";

interface PhoneFieldProps {
  label: string;
  /** The number as shown after the country code, e.g. "7 9123 4567". */
  value: string;
  onChange: (value: string) => void;
  country: CountryCode;
  onCountryChange: (country: CountryCode) => void;
  error?: string;
  hint?: ReactNode;
  disabled?: boolean;
  autoFocus?: boolean;
  name?: string;
  onBlur?: () => void;
  inputRef?: Ref<HTMLInputElement>;
}

const digitsOf = (text: string) => text.replace(/\D/g, "");

/**
 * A phone number: a searchable country code picker and the number, formatted as it's typed.
 * Pasting or autofilling a full international number picks the country automatically.
 */
export function PhoneField({
  label,
  value,
  onChange,
  country: requestedCountry,
  onCountryChange,
  error,
  hint,
  disabled,
  autoFocus,
  name,
  onBlur,
  inputRef,
}: PhoneFieldProps) {
  const { t } = useTranslation();
  // The guessed country might be one without phone numbers (e.g. Antarctica).
  const country = isSupportedCountry(requestedCountry) ? requestedCountry : "US";
  useEffect(() => {
    if (country !== requestedCountry) onCountryChange(country);
  }, [country, requestedCountry, onCountryChange]);

  const inputId = useId();
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy = [error ? errorId : null, hint && !error ? hintId : null].filter(Boolean).join(" ");

  const chooseCountry = (code: CountryCode) => {
    rememberCountry(code);
    onCountryChange(code);
    if (value && !value.startsWith("+")) onChange(formatPhoneInput(value, code));
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;

    if (raw.trim().startsWith("+")) {
      const split = splitInternational(raw);
      if (split) {
        rememberCountry(split.country);
        onCountryChange(split.country);
        onChange(split.national);
      } else {
        onChange(formatInternationalAsYouType(raw));
      }
      return;
    }

    // Reformat only while typing at the end, so editing in the middle keeps the caret.
    if (event.target.selectionStart !== raw.length) {
      onChange(raw);
      return;
    }
    // Backspacing over a space would otherwise be undone by reformatting.
    const removedOnlySpacing = raw.length < value.length && digitsOf(raw) === digitsOf(value);
    onChange(formatPhoneInput(removedOnlySpacing ? digitsOf(raw).slice(0, -1) : raw, country));
  };

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-fg">
        {label}
      </label>
      {/* Phone numbers read left to right in every language, country code first. */}
      <div
        dir="ltr"
        className={cn(
          "flex h-12 rounded-xl border bg-surface shadow-soft transition-[border-color,box-shadow] duration-150",
          "border-line-strong hover:border-fg-subtle/50 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15",
          error && "border-danger hover:border-danger focus-within:border-danger focus-within:ring-danger/15",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        <CountryPicker value={country} onChange={chooseCountry} disabled={disabled} />
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          autoFocus={autoFocus}
          disabled={disabled}
          value={value}
          onChange={handleChange}
          onBlur={() => {
            if (value && !value.startsWith("+")) onChange(formatPhoneInput(value, country));
            onBlur?.();
          }}
          placeholder={examplePhone(country) || t("auth.phone.placeholder")}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className="h-full min-w-0 flex-1 rounded-e-xl bg-transparent px-3.5 text-base text-fg tabular-nums outline-none placeholder:text-fg-subtle/80"
        />
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

/** Two-letter country code in a small tile (flag emoji don't render on Windows). */
function CountryTile({ code }: { code: CountryCode }) {
  return (
    <span
      aria-hidden="true"
      className="grid h-[1.125rem] w-[1.625rem] shrink-0 place-items-center rounded-[5px] bg-surface-3 text-[0.625rem] font-bold tracking-wide text-fg-muted"
    >
      {code}
    </span>
  );
}

function matches(country: Country, query: string): number {
  if (!query) return 1;
  const q = query.toLowerCase().replace(/^\+/, "");
  const names = [country.name.toLowerCase(), country.englishName.toLowerCase()];
  if (names.some((name) => name.startsWith(q)) || country.code.toLowerCase() === q) return 3;
  if (/^\d+$/.test(q) && country.dialCode.slice(1).startsWith(q)) return 2;
  return names.some((name) => name.includes(q)) ? 1 : 0;
}

function CountryPicker({
  value,
  onChange,
  disabled,
}: {
  value: CountryCode;
  onChange: (code: CountryCode) => void;
  disabled?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? "en";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();
  const current = getCountry(value, language);

  const results = useMemo(() => {
    const all = getCountryList(language);
    if (!query.trim()) return all;
    return all
      .map((country) => ({ country, score: matches(country, query.trim()) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.country);
  }, [query, language]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active, open, results]);

  const select = (code: CountryCode) => {
    onChange(code);
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((index) => (results.length ? (index + step + results.length) % results.length : 0));
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActive(event.key === "Home" ? 0 : Math.max(0, results.length - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const choice = results[active];
      if (choice) select(choice.code);
    }
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setQuery("");
          setActive(Math.max(0, getCountryList(language).findIndex((country) => country.code === value)));
        }
      }}
    >
      <Popover.Trigger
        type="button"
        disabled={disabled}
        aria-label={t("auth.phone.country", { country: current.name, code: current.dialCode })}
        className="flex h-full shrink-0 items-center gap-2 rounded-s-[11px] border-e border-line ps-3 pe-2.5 text-fg outline-none transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 data-[state=open]:bg-surface-2"
      >
        <CountryTile code={value} />
        <span className="text-[0.9375rem] tabular-nums">{current.dialCode}</span>
        <ChevronDown className="size-4 text-fg-subtle" aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          // The field is always left to right, so line the list up with its left edge.
          align={i18n.dir(language) === "rtl" ? "end" : "start"}
          sideOffset={8}
          collisionPadding={16}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (event.currentTarget as HTMLElement).querySelector("input")?.focus();
          }}
          dir={i18n.dir(language)}
          className="z-50 w-[min(21rem,calc(100vw-2rem))] animate-pop rounded-2xl bg-surface p-1.5 shadow-pop ring-1 ring-line outline-none"
        >
          <div className="relative p-1">
            <Search
              className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
              aria-hidden="true"
            />
            <input
              role="combobox"
              aria-label={t("auth.phone.search")}
              aria-expanded="true"
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={results[active] ? `${listboxId}-${results[active].code}` : undefined}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder={t("auth.phone.searchPlaceholder")}
              autoComplete="off"
              spellCheck={false}
              className="h-10 w-full rounded-xl bg-surface-2 ps-9 pe-3 text-base text-fg outline-none placeholder:text-fg-subtle focus:ring-2 focus:ring-primary/30 md:text-sm"
            />
          </div>
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label={t("auth.phone.countries")}
            className="scrollbar-thin mt-1 max-h-72 overflow-y-auto px-0.5 pb-0.5"
          >
            {results.map((country, index) => (
              <li
                key={country.code}
                id={`${listboxId}-${country.code}`}
                role="option"
                aria-selected={country.code === value}
                data-active={index === active}
                onMouseMove={() => setActive(index)}
                onClick={() => select(country.code)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-sm",
                  index === active && "bg-surface-2",
                )}
              >
                <CountryTile code={country.code} />
                <span className="min-w-0 flex-1 truncate text-fg">{country.name}</span>
                <span dir="ltr" className="text-fg-subtle tabular-nums">
                  {country.dialCode}
                </span>
                <Check
                  className={cn("size-4 shrink-0 text-primary", country.code !== value && "invisible")}
                  aria-hidden="true"
                />
              </li>
            ))}
            {results.length === 0 && (
              <li role="presentation" className="px-3 py-8 text-center text-sm text-fg-subtle">
                {t("auth.phone.noMatch", { query: query.trim() })}
              </li>
            )}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
