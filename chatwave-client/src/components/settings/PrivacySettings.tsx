import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Ban } from "lucide-react";
import { updateProfile } from "../../api/profile";
import { useBlockActions, useBlockedPeople } from "../../hooks/useBlocks";
import { useUpdateCurrentUser } from "../../hooks/useSession";
import { getErrorMessage } from "../../lib/errors";
import { useAuthStore } from "../../stores/authStore";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { Skeleton } from "../ui/Skeleton";
import { Switch } from "../ui/Switch";
import { SettingsCard } from "./SettingsCard";

/** Settings › Privacy: who sees when you're online, and the people you've blocked. */
export function PrivacySettings() {
  return (
    <>
      <OnlineStatusCard />
      <BlockedPeopleCard />
    </>
  );
}

function OnlineStatusCard() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useUpdateCurrentUser();

  const mutation = useMutation({
    mutationFn: (show: boolean) => updateProfile({ show_online_status: show }),
    // Flip the switch immediately; put it back if saving fails.
    onMutate: (show) => {
      const previous = useAuthStore.getState().user;
      if (previous) updateUser({ ...previous, show_online_status: show });
      return { previous };
    },
    onSuccess: (updated) => {
      updateUser(updated);
      toast.success(updated.show_online_status ? "Others can see when you're online" : "Your online status is hidden");
    },
    onError: (error, _show, context) => {
      if (context?.previous) updateUser(context.previous);
      toast.error(getErrorMessage(error, "That setting wasn't saved."));
    },
  });

  return (
    <SettingsCard title="Online status">
      <div className="flex items-start justify-between gap-6">
        <div>
          <label htmlFor="show-online-status" className="text-sm font-medium text-fg">
            Show when I'm online
          </label>
          <p id="show-online-status-hint" className="mt-1 text-sm text-fg-muted">
            People you chat with see "Online" or "Last seen" under your name. Turn this off to keep both private.
          </p>
        </div>
        <Switch
          id="show-online-status"
          checked={user?.show_online_status ?? true}
          onCheckedChange={(checked) => mutation.mutate(checked)}
          aria-describedby="show-online-status-hint"
        />
      </div>
    </SettingsCard>
  );
}

function BlockedPeopleCard() {
  const { data: people, isPending, isError } = useBlockedPeople();
  const { unblock } = useBlockActions();

  return (
    <SettingsCard
      title="Blocked people"
      description="Blocked people can't message you or see when you're online."
    >
      {isPending ? (
        <div className="space-y-4" aria-label="Loading blocked people">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <Skeleton className="h-3.5 w-40" />
            </div>
          ))}
        </div>
      ) : isError || !people ? (
        <p className="text-sm text-fg-muted">We couldn't load the people you blocked. Try again later.</p>
      ) : people.length === 0 ? (
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-fg-subtle">
            <Ban className="size-5" aria-hidden="true" />
          </span>
          <p className="text-sm text-fg-muted">
            You haven't blocked anyone. To block someone, open your chat with them and select their name.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {people.map((person) => {
            const firstName = person.name.split(" ")[0];
            return (
              <li key={person.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <Avatar name={person.name} src={person.avatar} />
                <div className="min-w-0 flex-1">
                  <p dir="auto" className="truncate text-sm font-medium text-fg">
                    {person.name}
                  </p>
                  {person.status_text && (
                    <p dir="auto" className="truncate text-xs text-fg-subtle">
                      {person.status_text}
                    </p>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={unblock.isPending && unblock.variables?.id === person.id}
                  onClick={() => unblock.mutate({ id: person.id, name: firstName })}
                >
                  Unblock<span className="sr-only"> {person.name}</span>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </SettingsCard>
  );
}
