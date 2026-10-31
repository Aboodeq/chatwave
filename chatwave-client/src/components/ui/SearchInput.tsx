import type { ComponentProps } from "react";
import { Search, X } from "lucide-react";
import { cn } from "../../lib/utils";

interface SearchInputProps extends Omit<ComponentProps<"input">, "onChange" | "value"> {
  value: string;
  onChange: (value: string) => void;
  /** Accessible name; also used as the placeholder unless one is given. */
  label: string;
}

export function SearchInput({ value, onChange, label, className, placeholder, ...props }: SearchInputProps) {
  return (
    <div className="relative">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && value) {
            event.stopPropagation();
            onChange("");
          }
        }}
        aria-label={label}
        placeholder={placeholder ?? label}
        autoComplete="off"
        spellCheck={false}
        className={cn(
          "h-10 w-full rounded-xl border border-transparent bg-surface-2 ps-9 pe-9 text-sm text-fg placeholder:text-fg-subtle",
          "outline-none transition-[border-color,box-shadow,background-color] focus:border-primary focus:bg-surface focus:ring-4 focus:ring-primary/15",
          "[&::-webkit-search-cancel-button]:hidden",
          className,
        )}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute end-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-fg-subtle outline-none hover:bg-surface-3 hover:text-fg focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
