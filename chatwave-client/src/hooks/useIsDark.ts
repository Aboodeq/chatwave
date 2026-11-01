import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
};

const isDark = () => document.documentElement.classList.contains("dark");

/** Whether the dark theme is showing right now (from the saved choice or the device). */
export function useIsDark(): boolean {
  return useSyncExternalStore(subscribe, isDark, () => false);
}
