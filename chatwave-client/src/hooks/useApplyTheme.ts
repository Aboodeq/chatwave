import { useEffect } from "react";
import { useUIStore } from "../stores/uiStore";

/** Keeps the `dark` class on <html> in sync with the saved preference and the OS setting. */
export function useApplyTheme() {
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && media.matches);
      document.documentElement.classList.toggle("dark", dark);
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0b1117" : "#ffffff");
    };

    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
}
