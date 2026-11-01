import { lazy, Suspense, type ComponentProps } from "react";
import type { PhoneField as PhoneFieldImpl } from "./PhoneField";
import { loadPhoneField } from "./phoneFieldLoader";

const Impl = lazy(() => loadPhoneField().then((module) => ({ default: module.PhoneField })));

/** The phone number field, loaded when first shown; a same-size placeholder meanwhile. */
export function PhoneField(props: ComponentProps<typeof PhoneFieldImpl>) {
  return (
    <Suspense
      fallback={
        <div className="space-y-1.5" aria-busy="true">
          <span className="text-sm font-medium text-fg">{props.label}</span>
          <div className="h-12 animate-pulse rounded-xl border border-line-strong bg-surface shadow-soft" />
        </div>
      }
    >
      <Impl {...props} />
    </Suspense>
  );
}
