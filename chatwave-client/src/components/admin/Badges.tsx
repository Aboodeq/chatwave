import { Ban, Circle, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { roleName } from "../../lib/roles";
import { cn } from "../../lib/utils";
import type { AdminUser } from "../../types/admin";

const badge = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold whitespace-nowrap";

/** The person's role; roles that open this dashboard get the shield. */
export function RoleBadge({ role, adminAccess }: { role: AdminUser["role"]; adminAccess: boolean }) {
  return (
    <span className={cn(badge, adminAccess ? "bg-primary-soft text-primary-soft-fg" : "bg-surface-2 text-fg-muted")}>
      {adminAccess && <ShieldCheck className="size-3" aria-hidden="true" />}
      <bdi>{roleName(role)}</bdi>
    </span>
  );
}

/** Suspended, online now, or active: each with an icon as well as a color. */
export function StatusBadge({ user }: { user: Pick<AdminUser, "suspended_at" | "is_online"> }) {
  const { t } = useTranslation();
  if (user.suspended_at) {
    return (
      <span className={cn(badge, "bg-danger-soft text-danger")}>
        <Ban className="size-3" aria-hidden="true" />
        {t("admin.status.suspended")}
      </span>
    );
  }
  if (user.is_online) {
    return (
      <span className={cn(badge, "bg-success-soft text-success")}>
        <Circle className="size-2 fill-current" aria-hidden="true" />
        {t("admin.status.online")}
      </span>
    );
  }
  return <span className={cn(badge, "bg-surface-2 text-fg-muted")}>{t("admin.status.active")}</span>;
}
