import { RadioGroup } from "radix-ui";
import { Check } from "lucide-react";
import { cn } from "../../lib/utils";
import { useUIStore, type ThemePreference } from "../../stores/uiStore";
import { SettingsCard } from "./SettingsCard";

const options: { value: ThemePreference; label: string; preview: string }[] = [
  { value: "light", label: "Light", preview: "bg-[#f4f6f8]" },
  { value: "dark", label: "Dark", preview: "bg-[#0b1117]" },
  { value: "system", label: "Match device", preview: "bg-[linear-gradient(135deg,#f4f6f8_50%,#0b1117_50%)]" },
];

/** Settings › Appearance: light, dark or match the device. Saved on this device only. */
export function AppearanceSettings() {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  return (
    <SettingsCard title="Theme" description="Choose how ChatWave looks on this device.">
      <RadioGroup.Root
        value={theme}
        onValueChange={(value) => setTheme(value as ThemePreference)}
        aria-label="Theme"
        className="grid grid-cols-3 gap-3"
      >
        {options.map((option) => (
          <RadioGroup.Item
            key={option.value}
            value={option.value}
            className={cn(
              "group rounded-xl p-2 text-start ring-1 ring-line transition outline-none",
              "hover:ring-line-strong focus-visible:ring-2 focus-visible:ring-ring",
              "data-[state=checked]:ring-2 data-[state=checked]:ring-primary",
            )}
          >
            {/* A tiny chat: an incoming and an outgoing bubble. */}
            <span aria-hidden="true" className={cn("flex h-16 flex-col justify-end gap-1.5 rounded-lg p-2", option.preview)}>
              <span className="h-2.5 w-3/5 rounded-full bg-white/90 ring-1 ring-black/5" />
              <span className="ms-auto h-2.5 w-2/5 rounded-full bg-[#0f7f7c]" />
            </span>
            <span className="mt-2 flex items-center justify-between gap-2 px-1 text-sm font-medium text-fg">
              {option.label}
              <Check className="size-4 text-primary opacity-0 group-data-[state=checked]:opacity-100" aria-hidden="true" />
            </span>
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
    </SettingsCard>
  );
}
