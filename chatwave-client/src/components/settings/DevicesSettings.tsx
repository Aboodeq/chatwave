import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Monitor, Smartphone } from "lucide-react";
import { getSessions, revokeOtherSessions, revokeSession } from "../../api/sessions";
import { useNow } from "../../hooks/useNow";
import { describeDevice } from "../../lib/device";
import { getErrorMessage } from "../../lib/errors";
import { formatLastSeen, formatShortDate } from "../../lib/utils";
import { Button } from "../ui/Button";
import { Skeleton } from "../ui/Skeleton";
import { SettingsCard } from "./SettingsCard";

/** Settings › Devices: where the account is signed in, with sign-out per device. */
export function DevicesSettings() {
  const queryClient = useQueryClient();
  const now = useNow(60_000);
  const { data: sessions, isPending, isError } = useQuery({ queryKey: ["sessions"], queryFn: getSessions });

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["sessions"] });

  const revoke = useMutation({
    mutationFn: revokeSession,
    onSuccess: () => {
      refresh();
      toast.success("Signed out of that device");
    },
    onError: (error) => toast.error(getErrorMessage(error, "That device wasn't signed out.")),
  });

  const revokeOthers = useMutation({
    mutationFn: revokeOtherSessions,
    onSuccess: (count) => {
      refresh();
      toast.success(`Signed out of ${count} other ${count === 1 ? "device" : "devices"}`);
    },
    onError: (error) => toast.error(getErrorMessage(error, "Other devices weren't signed out.")),
  });

  const others = sessions?.filter((session) => !session.current).length ?? 0;

  return (
    <SettingsCard title="Signed-in devices" description="Sign out of any device you don't recognize.">
      {isPending ? (
        <div className="space-y-4" aria-label="Loading devices">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="size-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
            </div>
          ))}
        </div>
      ) : isError || !sessions ? (
        <p className="text-sm text-fg-muted">We couldn't load your devices. Try again later.</p>
      ) : (
        <ul className="divide-y divide-line">
          {sessions.map((session) => {
            const device = describeDevice(session.user_agent);
            const Icon = device.mobile ? Smartphone : Monitor;
            const activity = session.current
              ? "Active now"
              : session.last_used_at
                ? formatLastSeen(session.last_used_at, now, "Last active")
                : "Not used yet";

            return (
              <li key={session.id} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-fg-muted">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-fg">
                    {device.label}
                    {session.current && (
                      <span className="rounded-full bg-success-soft px-2 py-0.5 text-[0.6875rem] font-semibold text-success">
                        This device
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-fg-subtle">
                    {activity}
                    {session.created_at && ` · Signed in ${formatShortDate(session.created_at)}`}
                  </p>
                </div>
                {!session.current && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:bg-danger-soft hover:text-danger"
                    loading={revoke.isPending && revoke.variables === session.id}
                    onClick={() => revoke.mutate(session.id)}
                  >
                    Sign out
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {others > 0 && (
        <div className="mt-5 border-t border-line pt-5">
          <Button variant="secondary" size="sm" loading={revokeOthers.isPending} onClick={() => revokeOthers.mutate()}>
            Sign out of all other devices
          </Button>
        </div>
      )}
    </SettingsCard>
  );
}
