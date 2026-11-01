import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Ban, CalendarDays, Clock, LogOut, Mail, Monitor, RotateCcw, ShieldCheck, ShieldOff, Smartphone } from "lucide-react";
import { usePerson, usePersonActions } from "../../hooks/useAdmin";
import { useNow } from "../../hooks/useNow";
import { describeDevice } from "../../lib/device";
import { getStatus } from "../../lib/errors";
import { formatInternational } from "../../lib/phone";
import { formatLastSeen, formatShortDate } from "../../lib/utils";
import { useAuthStore } from "../../stores/authStore";
import type { PersonDetail } from "../../types/admin";
import { ActivityList } from "../../components/admin/ActivityList";
import { RoleBadge, StatusBadge } from "../../components/admin/Badges";
import { ConfirmDialog } from "../../components/admin/ConfirmDialog";
import { formatCount } from "../../components/admin/charts/chartUtils";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";

type Pending = "suspend" | "restore" | "role" | "signOut" | null;

export default function PersonPage() {
  const id = Number(useParams().id);
  const { data, isPending, error } = usePerson(id);

  return (
    <>
      <Link
        to="/admin/people"
        className="mb-5 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-fg-muted outline-none hover:text-fg focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        People
      </Link>

      {isPending ? (
        <div className="space-y-5" aria-label="Loading">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : !data ? (
        <div className="rounded-2xl bg-surface p-10 text-center shadow-soft ring-1 ring-line">
          <p className="text-sm text-fg-muted">
            {getStatus(error) === 404 ? "This account doesn't exist anymore." : "We couldn't load this account."}
          </p>
        </div>
      ) : (
        <Person detail={data} />
      )}
    </>
  );
}

function Person({ detail }: { detail: PersonDetail }) {
  const { user, stats, devices, activity } = detail;
  const meId = useAuthStore((s) => s.user?.id);
  const isMe = meId === user.id;
  const firstName = user.name.split(" ")[0];
  const actions = usePersonActions(user.id, firstName);
  const [pending, setPending] = useState<Pending>(null);
  const now = useNow(60_000);
  const close = () => setPending(null);

  return (
    <div className="space-y-5">
      {user.suspended_at && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-danger-soft px-5 py-4 text-sm text-danger">
          <Ban className="size-5 shrink-0" aria-hidden="true" />
          <p className="min-w-0 flex-1">
            <span className="font-semibold">Suspended {formatShortDate(user.suspended_at)}.</span>{" "}
            {user.suspension_reason ? `Reason: ${user.suspension_reason.replace(/[.!?]?$/, (end) => end || ".")}` : "No reason was given."}{" "}
            They can't sign in until restored.
          </p>
          <Button variant="secondary" size="sm" onClick={() => setPending("restore")}>
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Restore access
          </Button>
        </div>
      )}

      <section className="rounded-2xl bg-surface p-5 shadow-soft ring-1 ring-line sm:p-6">
        <div className="flex flex-wrap items-start gap-5">
          <Avatar name={user.name} src={user.avatar} size="xl" online={user.is_online} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-fg">{user.name}</h1>
              <RoleBadge role={user.role} />
              <StatusBadge user={user} />
              {isMe && <span className="text-xs font-medium text-fg-subtle">(you)</span>}
            </div>
            {user.status_text && <p className="mt-1 text-sm text-fg-muted">{user.status_text}</p>}
            <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <Detail icon={user.email ? Mail : Smartphone} label={user.email ? "Email" : "Phone"}>
                <span className="tabular-nums">{user.email ?? (user.phone ? formatInternational(user.phone) : "—")}</span>
                {user.verified && <span className="ms-2 text-xs font-medium text-success">Verified</span>}
              </Detail>
              <Detail icon={CalendarDays} label="Joined">
                Joined {formatShortDate(user.created_at)}
              </Detail>
              <Detail icon={Clock} label="Last active">
                {user.last_seen_at ? formatLastSeen(user.last_seen_at, now, "Last active") : "Never signed in"}
              </Detail>
            </dl>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
          {user.role === "admin" ? (
            <Button variant="secondary" size="sm" disabled={isMe} onClick={() => setPending("role")}>
              <ShieldOff className="size-3.5" aria-hidden="true" />
              Remove admin access
            </Button>
          ) : (
            <Button variant="secondary" size="sm" disabled={isMe || Boolean(user.suspended_at)} onClick={() => setPending("role")}>
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Make admin
            </Button>
          )}
          <Button variant="secondary" size="sm" disabled={isMe} onClick={() => setPending("signOut")}>
            <LogOut className="size-3.5" aria-hidden="true" />
            Sign out everywhere
          </Button>
          {!user.suspended_at && (
            <Button
              variant="ghost"
              size="sm"
              disabled={isMe || user.role === "admin"}
              onClick={() => setPending("suspend")}
              className="text-danger hover:bg-danger-soft hover:text-danger"
            >
              <Ban className="size-3.5" aria-hidden="true" />
              Suspend
            </Button>
          )}
        </div>
        {(isMe || user.role === "admin") && (
          <p className="mt-3 text-xs text-fg-subtle">
            {isMe
              ? "This is your account. Ask another admin to change your role or suspend you, and use Settings to sign out your own devices."
              : "Admins can't be suspended. Remove their admin access first."}
          </p>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Figure label="Messages sent" value={stats.messages} />
        <Figure label="Conversations" value={stats.conversations} />
        <Figure label="Blocked by" value={stats.blocked_by} note={stats.blocked_by === 1 ? "person" : "people"} />
        <Figure label="Has blocked" value={stats.blocking} note={stats.blocking === 1 ? "person" : "people"} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl bg-surface p-5 shadow-soft ring-1 ring-line sm:p-6">
          <h2 className="text-[0.9375rem] font-semibold text-fg">Signed-in devices</h2>
          {devices.length === 0 ? (
            <p className="py-6 text-center text-sm text-fg-subtle">Not signed in anywhere.</p>
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
                        {device.last_used_at ? formatLastSeen(device.last_used_at, now, "Last active") : "Not used yet"}
                        {device.created_at && ` · Signed in ${formatShortDate(device.created_at)}`}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section className="rounded-2xl bg-surface p-5 shadow-soft ring-1 ring-line sm:p-6">
          <h2 className="mb-2 text-[0.9375rem] font-semibold text-fg">Admin history</h2>
          <ActivityList entries={activity} empty={`No admin has changed ${firstName}'s account.`} />
        </section>
      </div>

      <ConfirmDialog
        open={pending === "suspend"}
        onOpenChange={(open) => !open && close()}
        title={`Suspend ${firstName}?`}
        description={`${firstName} will be signed out on every device and won't be able to sign in until you restore access. Their messages stay.`}
        confirmLabel={`Suspend ${firstName}`}
        danger
        reasonLabel="Reason"
        pending={actions.suspend.isPending}
        onConfirm={(reason) => actions.suspend.mutate(reason, { onSuccess: close })}
      />
      <ConfirmDialog
        open={pending === "restore"}
        onOpenChange={(open) => !open && close()}
        title={`Restore ${firstName}'s access?`}
        description={`${firstName} will be able to sign in and use ChatWave again.`}
        confirmLabel="Restore access"
        pending={actions.restore.isPending}
        onConfirm={() => actions.restore.mutate(undefined, { onSuccess: close })}
      />
      <ConfirmDialog
        open={pending === "role"}
        onOpenChange={(open) => !open && close()}
        title={user.role === "admin" ? `Remove ${firstName}'s admin access?` : `Make ${firstName} an admin?`}
        description={
          user.role === "admin"
            ? `${firstName} will no longer be able to open this dashboard.`
            : `${firstName} will be able to see everyone's accounts here, suspend people and change roles.`
        }
        confirmLabel={user.role === "admin" ? "Remove admin access" : "Make admin"}
        danger={user.role === "admin"}
        pending={actions.setRole.isPending}
        onConfirm={() => actions.setRole.mutate(user.role === "admin" ? "user" : "admin", { onSuccess: close })}
      />
      <ConfirmDialog
        open={pending === "signOut"}
        onOpenChange={(open) => !open && close()}
        title={`Sign ${firstName} out everywhere?`}
        description={`${firstName} will need to sign in again on every device. Useful after a lost phone or a shared computer.`}
        confirmLabel="Sign out everywhere"
        pending={actions.signOut.isPending}
        onConfirm={() => actions.signOut.mutate(undefined, { onSuccess: close })}
      />
    </div>
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
