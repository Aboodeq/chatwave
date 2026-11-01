import { DropdownMenu } from "radix-ui";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, LogOut, Settings, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { signInIdentifier } from "../../lib/account";
import { selectCanAccessAdmin, useAuthStore } from "../../stores/authStore";
import { useSignOut } from "../../hooks/useSession";
import { cn } from "../../lib/utils";
import { Avatar } from "../ui/Avatar";
import { menuContent, menuItem, menuItemDanger, menuSeparator } from "../ui/menuStyles";

export function UserMenu() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const canAdmin = useAuthStore(selectCanAccessAdmin);
  const navigate = useNavigate();
  const signOut = useSignOut();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={t("chat.menu.label")}
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
              <p className="truncate text-xs text-fg-subtle">
                <span dir="ltr">{signInIdentifier(user)}</span>
              </p>
            </div>
          </div>

          <DropdownMenu.Separator className={menuSeparator} />
          <DropdownMenu.Item onSelect={() => navigate("/settings/profile")} className={menuItem}>
            <UserRound aria-hidden="true" />
            {t("chat.menu.profile")}
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => navigate("/settings")} className={menuItem}>
            <Settings aria-hidden="true" />
            {t("chat.menu.settings")}
          </DropdownMenu.Item>
          {canAdmin && (
            <DropdownMenu.Item onSelect={() => navigate("/admin")} className={menuItem}>
              <LayoutDashboard aria-hidden="true" />
              {t("chat.menu.admin")}
            </DropdownMenu.Item>
          )}

          <DropdownMenu.Separator className={menuSeparator} />
          <DropdownMenu.Item onSelect={() => void signOut()} className={cn(menuItem, menuItemDanger)}>
            <LogOut aria-hidden="true" className="rtl:-scale-x-100" />
            {t("chat.menu.signOut")}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
