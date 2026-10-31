import { Monitor, Moon, Sun } from "lucide-react";
import { useUIStore, type ThemePreference } from "../../stores/uiStore";
import { IconButton } from "./IconButton";

const order: ThemePreference[] = ["system", "light", "dark"];
const icons = { system: Monitor, light: Sun, dark: Moon };
const names = { system: "system", light: "light", dark: "dark" };

/** Cycles system → light → dark. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const next = order[(order.indexOf(theme) + 1) % order.length];

  return (
    <IconButton
      icon={icons[theme]}
      label={`Theme: ${names[theme]}. Switch to ${names[next]}.`}
      onClick={() => setTheme(next)}
      className={className}
    />
  );
}
