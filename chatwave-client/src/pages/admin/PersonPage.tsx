import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Dialog, RadioGroup } from "radix-ui";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Ban,
  CalendarDays,
  Check,
  Clock,
  KeyRound,
  LogOut,
  Mail,
  Monitor,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  X,
} from "lucide-react";
import { usePerson, usePersonActions, useRoles } from "../../hooks/useAdmin";
import { useNow } from "../../hooks/useNow";
import { describeDevice } from "../../lib/device";
import { getStatus } from "../../lib/errors";
import { formatInternational } from "../../lib/phone";
import { opensDashboard, roleName } from "../../lib/roles";
import { cn, formatMoment, formatShortDate } from "../../lib/utils";
import { selectCan, useAuthStore } from "../../stores/authStore";
import type { AdminRole, AdminUser, PersonDetail } from "../../types/admin";
import { ActivityList } from "../../components/admin/ActivityList";
import { RoleBadge, StatusBadge } from "../../components/admin/Badges";
import { ConfirmDialog } from "../../components/admin/ConfirmDialog";
import { formatCount } from "../../components/admin/charts/chartUtils";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { IconButton } from "../../components/ui/IconButton";
import { Skeleton } from "../../components/ui/Skeleton";

type Pending = "suspend" | "restore" | "role" | "signOut" | null;

export default function PersonPage() {
  const { t } = useTranslation();
  const id = Number(useParams().id);
  const { data, isPending, error } = usePerson(id);

  return (
    <>
      <Link
        to="/admin/people"
        className="mb-5 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-fg-muted outline-none hover:text-fg focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        {t("admin.nav.people")}
      </Link>

      {isPending ? (
        <div className="space-y-5" aria-label={t("admin.person.loading")}>
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : !data ? (
        <div className="rounded-2xl bg-surface p-10 text-center shadow-soft ring-1 ring-line">
          <p className="text-sm text-fg-muted">
            {getStatus(error) === 404 ? t("admin.person.gone") : t("admin.person.loadFailed")}
          </p>
        </div>
      ) : (
        <Person detail={data} />
      )}
    </>
  );
}

function Person({ detail }: { detail: PersonDetail }) {
  const { t } = useTranslation();
  const { user, stats, devices, activity } = detail;
  const me = useAuthStore((s) => s.user);
  const canModerate = useAuthStore(selectCan("admin.moderate"));
  const canChangeRoles = useAuthStore(selectCan("admin.roles"));
  const iAmAdmin = me?.role?.key === "admin";
  const isMe = me?.id === user.id;
  // Only admins can act on people who can open this dashboard (the API checks this too).
  const outranked = !iAmAdmin && user.has_admin_access;
  const isAdminRole = user.role.key === "admin";
  const firstName = user.name.split(" ")[0];
  const actions = usePersonActions(user.id, firstName);
  const [pending, setPending] = useState<Pending>(null);
  const now = useNow(60_000);
  const close = () => setPending(null);

  const note = isMe
    ? t("admin.person.notes.me")
    : outranked
      ? t("admin.person.notes.outranked")
      : isAdminRole && canModerate && !user.suspended_at
        ? t("admin.person.notes.adminRole")
        : null;

  return (
    <div className="space-y-5">
      {user.suspended_at && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-danger-soft px-5 py-4 text-sm text-danger">
          <Ban className="size-5 shrink-0" aria-hidden="true" />
          <p className="min-w-0 flex-1">
            <span className="font-semibold">{t("admin.person.suspendedOn", { date: formatShortDate(user.suspended_at) })}</span>{" "}
            {user.suspension_reason
              ? t("admin.person.reason", { reason: user.suspension_reason })
              : t("admin.person.noReason")}{" "}
            {t("admin.person.cantSignIn")}
          </p>
          {canModerate && !outranked && (
            <Button variant="secondary" size="sm" onClick={() => setPending("restore")}>
              <RotateCcw className="size-3.5" aria-hidden="true" />
              {t("admin.person.restore")}
            </Button>
          )}
        </div>
      )}

      <section className="rounded-2xl bg-surface p-5 shadow-soft ring-1 ring-line sm:p-6">
        <div className="flex flex-wrap items-start gap-5">
          <Avatar name={user.name} src={user.avatar} size="xl" online={user.is_online} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 dir="auto" className="font-display text-2xl font-semibold tracking-tight text-fg">
                {user.name}
              </h1>
              <RoleBadge role={user.role} adminAccess={user.has_admin_access} />
              <StatusBadge user={user} />
              {isMe && <span className="text-xs font-medium text-fg-subtle">{t("admin.person.you")}</span>}
            </div>
            {user.status_text && (
              <p dir="auto" className="mt-1 text-sm text-fg-muted">
                {user.status_text}
              </p>
            )}
            <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <Detail icon={user.email ? Mail : Smartphone} label={user.email ? t("admin.person.email") : t("admin.person.phone")}>
                <span dir="ltr" className="tabular-nums">
                  {user.email ?? (user.phone ? formatInternational(user.phone) : "—")}
                </span>
                {user.verified && <span className="ms-2 text-xs font-medium text-success">{t("admin.person.verified")}</span>}
              </Detail>
              <Detail icon={CalendarDays} label={t("admin.person.joined")}>
                {t("admin.person.joinedOn", { date: formatShortDate(user.created_at) })}
              </Detail>
              <Detail icon={Clock} label={t("admin.person.lastActive")}>
                {user.last_seen_at ? formatMoment(user.last_seen_at, now, "lastActive") : t("admin.person.neverSignedIn")}
              </Detail>
            </dl>
          </div>
        </div>

        {(canChangeRoles || canModerate) && (
          <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
            {canChangeRoles && (
              <Button variant="secondary" size="sm" disabled={isMe || outranked} onClick={() => setPending("role")}>
                <KeyRound className="size-3.5" aria-hidden="true" />
                {t("admin.person.changeRole")}
              </Button>
            )}
            {canModerate && (
              <Button variant="secondary" size="sm" disabled={isMe || outranked} onClick={() => setPending("signOut")}>
                <LogOut className="size-3.5 rtl:-scale-x-100" aria-hidden="true" />
                {t("admin.person.signOutEverywhere")}
              </Button>
            )}
            {canModerate && !user.suspended_at && (
              <Button
                variant="ghost"
                size="sm"
                disabled={isMe || outranked || isAdminRole}
                onClick={() => setPending("suspend")}
                className="text-danger hover:bg-danger-soft hover:text-danger"
              >
                <Ban className="size-3.5" aria-hidden="true" />
                {t("admin.person.suspend")}
              </Button>
            )}
          </div>
        )}
        {note && (canChangeRoles || canModerate) && <p className="mt-3 text-xs text-fg-subtle">{note}</p>}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Figure label={t("admin.person.stats.messages")} value={stats.messages} />
        <Figure label={t("admin.person.stats.conversations")} value={stats.conversations} />
        <Figure label={t("admin.person.stats.blockedBy")} value={stats.blocked_by} note={t("admin.units.people", { count: stats.blocked_by })} />
        <Figure label={t("admin.person.stats.blocking")} value={stats.blocking} note={t("admin.units.people", { count: stats.blocking })} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl bg-surface p-5 shadow-soft ring-1 ring-line sm:p-6">
          <h2 className="text-[0.9375rem] font-semibold text-fg">{t("admin.person.devices.title")}</h2>
          {devices.length === 0 ? (
            <p className="py-6 text-center text-sm text-fg-subtle">{t("admin.person.devices.none")}</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {devices.map((device) => {
                const { label, mobile } = describeDevice(device.user_agent);
                const Icon = mobile ? Smartphone : Monitor;
                return (
                  <li key={device.id} className="flex items-center gap-3 py-3 first:pt-1 last:pb-0">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-fg-muted">
                      <Icon className="size-[1.125rem]" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-fg">{label}</p>
                      <p className="text-xs text-fg-subtle">
                        {device.last_used_at
                          ? formatMoment(device.last_used_at, now, "lastActive")
                          : t("settings.devices.notUsed")}
                        {device.created_at &&
                          ` · ${t("settings.devices.signedIn", { date: formatShortDate(device.created_at) })}`}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section className="rounded-2xl bg-surface p-5 shadow-soft ring-1 ring-line sm:p-6">
          <h2 className="mb-2 text-[0.9375rem] font-semibold text-fg">{t("admin.person.history.title")}</h2>
          <ActivityList entries={activity} empty={t("admin.person.history.empty", { name: firstName })} />
        </section>
      </div>

      <ConfirmDialog
        open={pending === "suspend"}
        onOpenChange={(open) => !open && close()}
        title={t("admin.person.confirm.suspendTitle", { name: firstName })}
        description={t("admin.person.confirm.suspendBody", { name: firstName })}
        confirmLabel={t("admin.person.confirm.suspendConfirm", { name: firstName })}
        danger
        reasonLabel={t("admin.person.confirm.reason")}
        pending={actions.suspend.isPending}
        onConfirm={(reason) => actions.suspend.mutate(reason, { onSuccess: close })}
      />
      <ConfirmDialog
        open={pending === "restore"}
        onOpenChange={(open) => !open && close()}
        title={t("admin.person.confirm.restoreTitle", { name: firstName })}
        description={t("admin.person.confirm.restoreBody", { name: firstName })}
        confirmLabel={t("admin.person.restore")}
        pending={actions.restore.isPending}
        onConfirm={() => actions.restore.mutate(undefined, { onSuccess: close })}
      />
      <ConfirmDialog
        open={pending === "signOut"}
        onOpenChange={(open) => !open && close()}
        title={t("admin.person.confirm.signOutTitle", { name: firstName })}
        description={t("admin.person.confirm.signOutBody", { name: firstName })}
        confirmLabel={t("admin.person.signOutEverywhere")}
        pending={actions.signOut.isPending}
        onConfirm={() => actions.signOut.mutate(undefined, { onSuccess: close })}
      />
      <RoleDialog
        open={pending === "role"}
        onClose={close}
        user={user}
        firstName={firstName}
        saving={actions.setRole.isPending}
        onSave={(roleId) => actions.setRole.mutate(roleId, { onSuccess: close })}
      />
    </div>
  );
}

/**
 * Pick a role for someone. Roles the viewer can't hand out (the Admin role unless they're
 * an admin, or one with permissions they don't have) are shown but can't be chosen.
 */
function RoleDialog({
  open,
  onClose,
  user,
  firstName,
  saving,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  user: AdminUser;
  firstName: string;
  saving: boolean;
  onSave: (roleId: number) => void;
}) {
  const { t } = useTranslation();
  const { data } = useRoles();
  const me = useAuthStore((s) => s.user);
  const [choice, setChoice] = useState<number | null>(null);
  const selected = choice ?? user.role.id;

  const canGive = (role: AdminRole) => {
    if (me?.role?.key === "admin") return !(role.key === "admin" && user.suspended_at);
    if (role.key === "admin" || user.role.key === "admin") return false;
    return role.permissions.every((permission) => me?.permissions?.includes(permission));
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setChoice(null);
          onClose();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 animate-fade-in bg-[#04121a]/45 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed inset-x-3 top-[8vh] z-50 mx-auto flex max-h-[84vh] max-w-lg animate-pop flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-pop outline-none">
          <div className="flex items-start justify-between gap-4 px-6 pt-6">
            <div>
              <Dialog.Title className="font-display text-lg font-semibold">
                {t("admin.person.roleDialog.title", { name: firstName })}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-fg-muted">
                {t("admin.person.roleDialog.description", { name: firstName })}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <IconButton icon={X} label={t("common.close")} size="sm" className="-me-1.5" />
            </Dialog.Close>
          </div>

          <RadioGroup.Root
            value={String(selected)}
            onValueChange={(value) => setChoice(Number(value))}
            aria-label={t("admin.people.roleLabel")}
            className="scrollbar-thin mt-4 space-y-2 overflow-y-auto px-6 pb-2"
          >
            {data?.roles.map((role) => {
              const allowed = canGive(role) || role.id === user.role.id;
              const current = role.id === user.role.id;
              return (
                <RadioGroup.Item
                  key={role.id}
                  value={String(role.id)}
                  disabled={!allowed}
                  className={cn(
                    "group flex w-full items-start gap-3 rounded-xl p-3.5 text-start ring-1 ring-line transition outline-none",
                    "hover:ring-line-strong focus-visible:ring-2 focus-visible:ring-ring",
                    "data-[state=checked]:bg-primary-soft/50 data-[state=checked]:ring-2 data-[state=checked]:ring-primary",
                    "disabled:cursor-not-allowed disabled:opacity-55",
                  )}
                >
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ring-1 ring-line-strong group-data-[state=checked]:bg-primary group-data-[state=checked]:ring-primary">
                    <Check className="size-3 text-primary-fg opacity-0 group-data-[state=checked]:opacity-100" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-fg">
                      <bdi>{roleName(role)}</bdi>
                      {current && (
                        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[0.6875rem] font-medium text-fg-muted">
                          {t("admin.person.roleDialog.current")}
                        </span>
                      )}
                    </span>
                    <span dir={role.key ? undefined : "auto"} className="mt-0.5 block text-[0.8125rem] text-fg-muted">
                      {role.key ? t(`admin.roleDescriptions.${role.key}`) : role.description}
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-subtle">
                      {opensDashboard(role.permissions) && (
                        <span className="inline-flex items-center gap-1">
                          <ShieldCheck className="size-3.5" aria-hidden="true" />
                          {t("admin.person.roleDialog.dashboard")}
                        </span>
                      )}
                      <span>{t("admin.roles.peopleCount", { count: role.users_count })}</span>
                      {!allowed && <span className="font-medium">{t("admin.person.roleDialog.notAllowed")}</span>}
                    </span>
                  </span>
                </RadioGroup.Item>
              );
            })}
          </RadioGroup.Root>

          <div className="mt-2 flex justify-end gap-2 border-t border-line px-6 py-4">
            <Dialog.Close asChild>
              <Button variant="secondary">{t("common.cancel")}</Button>
            </Dialog.Close>
            <Button loading={saving} disabled={selected === user.role.id} onClick={() => onSave(selected)}>
              {t("admin.person.roleDialog.save")}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Detail({ icon: Icon, label, children }: { icon: typeof Mail; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-fg-muted">
      <Icon className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
      <dt className="sr-only">{label}</dt>
      <dd className="min-w-0 truncate text-fg">{children}</dd>
    </div>
  );
}

function Figure({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="rounded-2xl bg-surface p-5 shadow-soft ring-1 ring-line">
      <p className="text-sm font-medium text-fg-muted">{label}</p>
      <p className="mt-2 text-[1.625rem] leading-none font-semibold tracking-tight text-fg">
        {formatCount(value)}
        {note && <span className="ms-1.5 text-sm font-normal text-fg-subtle">{note}</span>}
      </p>
    </div>
  );
}
