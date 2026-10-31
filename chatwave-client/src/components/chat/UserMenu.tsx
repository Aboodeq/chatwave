import { DropdownMenu } from "radix-ui";
import { useNavigate } from "react-router-dom";
import { LogOut, Settings } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { useSignOut } from "../../hooks/useSession";
import { cn } from "../../lib/utils";
import { Avatar } from "../ui/Avatar";
import { menuContent, menuItem, menuItemDanger, menuSeparator } from "../ui/menuStyles";

export function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
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
          <DropdownMenu.Item onSelect={() => navigate("/settings")} className={menuItem}>
            <Settings aria-hidden="true" />
            Settings
          </DropdownMenu.Item>

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
