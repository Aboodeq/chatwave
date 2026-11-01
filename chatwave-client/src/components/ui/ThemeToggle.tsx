import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useIsDark } from "../../hooks/useIsDark";
import { useUIStore } from "../../stores/uiStore";
import { IconButton } from "./IconButton";

export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useTranslation();
  const dark = useIsDark();
  const setTheme = useUIStore((s) => s.setTheme);

  return (
    <IconButton
      icon={dark ? Sun : Moon}
      label={dark ? t("theme.toLight") : t("theme.toDark")}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className={className ?? "ring-1 ring-line"}
    />
  );
}
