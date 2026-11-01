import { Ban, Circle, ShieldCheck } from "lucide-react";
import { cn } from "../../lib/utils";
import type { AdminUser } from "../../types/admin";

const badge = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold whitespace-nowrap";

export function RoleBadge({ role }: { role: AdminUser["role"] }) {
  if (role !== "admin") return <span className={cn(badge, "bg-surface-2 text-fg-muted")}>Member</span>;
  return (
    <span className={cn(badge, "bg-primary-soft text-primary-soft-fg")}>
      <ShieldCheck className="size-3" aria-hidden="true" />
      Admin
    </span>
  );
}

/** Suspended, online now, or active: each with an icon as well as a color. */
export function StatusBadge({ user }: { user: Pick<AdminUser, "suspended_at" | "is_online"> }) {
  if (user.suspended_at) {
    return (
      <span className={cn(badge, "bg-danger-soft text-danger")}>
        <Ban className="size-3" aria-hidden="true" />
        Suspended
      </span>
    );
  }
  if (user.is_online) {
    return (
      <span className={cn(badge, "bg-success-soft text-success")}>
        <Circle className="size-2 fill-current" aria-hidden="true" />
        Online
      </span>
    );
  }
  return <span className={cn(badge, "bg-surface-2 text-fg-muted")}>Active</span>;
}
