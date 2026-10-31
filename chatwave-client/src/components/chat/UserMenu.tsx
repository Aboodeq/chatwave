import { DropdownMenu } from "radix-ui";
import { Check, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { useUIStore, type ThemePreference } from "../../stores/uiStore";
import { useSignOut } from "../../hooks/useSession";
import { cn } from "../../lib/utils";
import { Avatar } from "../ui/Avatar";
import { menuContent, menuItem, menuItemDanger, menuLabel, menuSeparator } from "../ui/menuStyles";

const themes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Match system", icon: Monitor },
] as const;

export function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const signOut = useSignOut();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Account and settings"
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        <Avatar name={user?.name} src={user?.avatar} size="sm" />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} className={cn(menuContent, "w-64")}>
          <div className="flex items-center gap-3 px-2.5 py-2.5">
            <Avatar name={user?.name} src={user?.avatar} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user?.name}</p>
              <p className="truncate text-xs text-fg-subtle">{user?.email}</p>
            </div>
          </div>

          <DropdownMenu.Separator className={menuSeparator} />
          <DropdownMenu.Label className={menuLabel}>Appearance</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={theme} onValueChange={(value) => setTheme(value as ThemePreference)}>
            {themes.map(({ value, label, icon: Icon }) => (
              <DropdownMenu.RadioItem key={value} value={value} className={menuItem}>
                <Icon aria-hidden="true" />
                {label}
                <DropdownMenu.ItemIndicator className="ms-auto">
                  <Check aria-hidden="true" className="text-primary!" />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>

          <DropdownMenu.Separator className={menuSeparator} />
          <DropdownMenu.Item onSelect={() => void signOut()} className={cn(menuItem, menuItemDanger)}>
            <LogOut aria-hidden="true" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
