import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { updateProfile } from "../../api/profile";
import { useUpdateCurrentUser } from "../../hooks/useSession";
import { getErrorMessage } from "../../lib/errors";
import { useAuthStore } from "../../stores/authStore";
import { Switch } from "../ui/Switch";
import { SettingsSection } from "./SettingsSection";

export function PrivacySection() {
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
    <SettingsSection id="privacy" title="Privacy">
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
    </SettingsSection>
  );
}
