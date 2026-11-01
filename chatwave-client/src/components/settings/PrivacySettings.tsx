import { useId } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Ban, CheckCheck, LockKeyhole } from "lucide-react";
import { updateProfile } from "../../api/profile";
import { useBlockActions, useBlockedPeople } from "../../hooks/useBlocks";
import { useUpdateCurrentUser } from "../../hooks/useSession";
import { getErrorMessage } from "../../lib/errors";
import { selectCan, useAuthStore } from "../../stores/authStore";
import type { User } from "../../types/user";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { Skeleton } from "../ui/Skeleton";
import { Switch } from "../ui/Switch";
import { SettingsCard } from "./SettingsCard";

/** Settings › Privacy: read receipts, who sees when you're online, and the people you've blocked. */
export function PrivacySettings() {
  const { t } = useTranslation();
  const canHideReceipts = useAuthStore(selectCan("receipts.hide"));
  const canHidePresence = useAuthStore(selectCan("presence.hide"));
  const seesStatus = useAuthStore(selectCan("messages.status"));

  return (
    <>
      <SettingsCard title={t("settings.privacy.receipts.title")}>
        <PrivacySwitch
          setting="read_receipts"
          allowed={canHideReceipts}
          label={t("settings.privacy.receipts.label")}
          hint={t("settings.privacy.receipts.hint")}
          locked={t("settings.privacy.receipts.locked")}
          savedOn={t("settings.privacy.receipts.on")}
          savedOff={t("settings.privacy.receipts.off")}
        />
        {!seesStatus && (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-surface-2 px-3.5 py-3 text-sm text-fg-muted">
            <CheckCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {t("settings.privacy.receipts.noStatus")}
          </p>
        )}
      </SettingsCard>

      <SettingsCard title={t("settings.privacy.online.title")}>
        <PrivacySwitch
          setting="show_online_status"
          allowed={canHidePresence}
          label={t("settings.privacy.online.label")}
          hint={t("settings.privacy.online.hint")}
          locked={t("settings.privacy.online.locked")}
          savedOn={t("settings.privacy.online.shown")}
          savedOff={t("settings.privacy.online.hidden")}
        />
      </SettingsCard>

      <BlockedPeopleCard />
    </>
  );
}

type PrivacySetting = "read_receipts" | "show_online_status";

/**
 * An on/off privacy setting. Turning it off needs a role that allows it; without that it
 * stays on (the server also treats it as on), and the switch says why it's locked.
 */
function PrivacySwitch({
  setting,
  allowed,
  label,
  hint,
  locked,
  savedOn,
  savedOff,
}: {
  setting: PrivacySetting;
  allowed: boolean;
  label: string;
  hint: string;
  locked: string;
  savedOn: string;
  savedOff: string;
}) {
  const { t } = useTranslation();
  const id = useId();
  const user = useAuthStore((s) => s.user);
  const updateUser = useUpdateCurrentUser();
  const checked = !allowed || (user?.[setting] ?? true);

  const mutation = useMutation({
    mutationFn: (on: boolean) => updateProfile({ [setting]: on }),
    // Flip the switch immediately; put it back if saving fails.
    onMutate: (on) => {
      const previous = useAuthStore.getState().user;
      if (previous) updateUser({ ...previous, [setting]: on } as User);
      return { previous };
    },
    onSuccess: (updated) => {
      updateUser(updated);
      toast.success(updated[setting] ? savedOn : savedOff);
    },
    onError: (error, _on, context) => {
      if (context?.previous) updateUser(context.previous);
      toast.error(getErrorMessage(error, t("settings.privacy.saveFailed")));
    },
  });

  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-fg">
          {label}
        </label>
        <p id={`${id}-hint`} className="mt-1 text-sm text-fg-muted">
          {hint}
        </p>
        {!allowed && (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-fg-subtle">
            <LockKeyhole className="size-3.5 shrink-0" aria-hidden="true" />
            {locked}
          </p>
        )}
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={!allowed}
        onCheckedChange={(on) => mutation.mutate(on)}
        aria-describedby={`${id}-hint`}
      />
    </div>
  );
}

function BlockedPeopleCard() {
  const { t } = useTranslation();
  const { data: people, isPending, isError } = useBlockedPeople();
  const { unblock } = useBlockActions();

  return (
    <SettingsCard title={t("settings.privacy.blocked.title")} description={t("settings.privacy.blocked.description")}>
      {isPending ? (
        <div className="space-y-4" aria-label={t("settings.privacy.blocked.loading")}>
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <Skeleton className="h-3.5 w-40" />
            </div>
          ))}
        </div>
      ) : isError || !people ? (
        <p className="text-sm text-fg-muted">{t("settings.privacy.blocked.loadFailed")}</p>
      ) : people.length === 0 ? (
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-fg-subtle">
            <Ban className="size-5" aria-hidden="true" />
          </span>
          <p className="text-sm text-fg-muted">{t("settings.privacy.blocked.empty")}</p>
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
                  {t("settings.privacy.blocked.unblock")}
                  <span className="sr-only"> {person.name}</span>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </SettingsCard>
  );
}
