/** The phone field and its number library, loaded on demand (they're large). */
export const loadPhoneField = () => import("./PhoneField");

/** Fetch it in the background, so switching to "Phone" feels instant. */
export function preloadPhoneField() {
  const run = () => void loadPhoneField();
  if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(run, { timeout: 3000 });
  else window.setTimeout(run, 1200);
}
