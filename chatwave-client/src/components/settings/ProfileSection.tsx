import { useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Camera, Loader2, UserRound } from "lucide-react";
import { removeAvatar, updateProfile, uploadAvatar } from "../../api/profile";
import { useUpdateCurrentUser } from "../../hooks/useSession";
import { conversationKeys } from "../../hooks/useConversations";
import { getErrorMessage, getFieldErrors } from "../../lib/errors";
import { useAuthStore } from "../../stores/authStore";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { TextField } from "../ui/TextField";
import { SettingsSection } from "./SettingsSection";

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const ABOUT_MAX = 160;

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(100, "Name is too long."),
  status_text: z.string().trim().max(ABOUT_MAX, `Keep it under ${ABOUT_MAX} characters.`),
});

type FormValues = z.infer<typeof schema>;

export function ProfileSection() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useUpdateCurrentUser();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: { name: user?.name ?? "", status_text: user?.status_text ?? "" },
    resetOptions: { keepDirtyValues: true },
  });
  const about = useWatch({ control, name: "status_text" }) ?? "";

  // Others see profile changes through the conversation list.
  const refreshConversations = () => void queryClient.invalidateQueries({ queryKey: conversationKeys.all });

  const save = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updated) => {
      updateUser(updated);
      reset({ name: updated.name, status_text: updated.status_text });
      refreshConversations();
      toast.success("Profile saved");
    },
    onError: (error) => {
      const fields = getFieldErrors(error);
      if (fields.name) setError("name", { message: fields.name });
      if (fields.status_text) setError("status_text", { message: fields.status_text });
      if (!fields.name && !fields.status_text) toast.error(getErrorMessage(error, "Your profile wasn't saved."));
    },
  });

  const upload = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: (updated) => {
      updateUser(updated);
      refreshConversations();
      toast.success("Photo updated");
    },
    onError: (error) => toast.error(getErrorMessage(error, "We couldn't upload that photo.")),
  });

  const remove = useMutation({
    mutationFn: removeAvatar,
    onSuccess: (updated) => {
      updateUser(updated);
      refreshConversations();
      toast.success("Photo removed");
    },
    onError: (error) => toast.error(getErrorMessage(error, "We couldn't remove your photo.")),
  });

  return (
    <SettingsSection id="profile" title="Profile" description="How other people see you in ChatWave.">
      <div className="flex items-center gap-5">
        <div className="relative">
          <Avatar name={user?.name} src={user?.avatar} size="xl" />
          {upload.isPending && (
            <span className="absolute inset-0 grid place-items-center rounded-full bg-black/45">
              <Loader2 className="size-5 animate-spin text-white" aria-label="Uploading photo" />
            </span>
          )}
        </div>
        <div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInput.current?.click()}
              disabled={upload.isPending || remove.isPending}
            >
              <Camera className="size-4" aria-hidden="true" />
              {user?.avatar ? "Change photo" : "Upload photo"}
            </Button>
            {user?.avatar && (
              <Button variant="ghost" size="sm" onClick={() => remove.mutate()} loading={remove.isPending}>
                Remove
              </Button>
            )}
          </div>
          <p className="mt-2 text-xs text-fg-subtle">JPG, PNG or WebP, up to 2 MB.</p>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = ""; // choosing the same file again should still upload
            if (!file) return;
            if (file.size > MAX_PHOTO_BYTES) {
              toast.error("The photo must be 2 MB or smaller.");
              return;
            }
            upload.mutate(file);
          }}
        />
      </div>

      <form
        noValidate
        className="mt-6 space-y-5 border-t border-line pt-6"
        onSubmit={handleSubmit((values) => save.mutate(values))}
      >
        <TextField
          label="Display name"
          icon={UserRound}
          autoComplete="name"
          error={errors.name?.message}
          {...register("name")}
        />
        <TextField
          label="About"
          placeholder="What you're working on, or how to reach you"
          maxLength={ABOUT_MAX}
          error={errors.status_text?.message}
          hint={`Shown under your name. ${about.length}/${ABOUT_MAX}`}
          {...register("status_text")}
        />
        <div className="flex items-center gap-3">
          <Button type="submit" loading={save.isPending} disabled={!isDirty}>
            Save changes
          </Button>
          {isDirty && !save.isPending && (
            <Button variant="ghost" onClick={() => reset()}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </SettingsSection>
  );
}
