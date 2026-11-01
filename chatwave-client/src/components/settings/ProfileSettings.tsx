import { useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Camera, Loader2, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";
import { removeAvatar, updateProfile, uploadAvatar } from "../../api/profile";
import { useUpdateCurrentUser } from "../../hooks/useSession";
import { conversationKeys } from "../../hooks/useConversations";
import { getErrorMessage, getFieldErrors } from "../../lib/errors";
import { formatNumber } from "../../lib/utils";
import { useAuthStore } from "../../stores/authStore";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { TextField } from "../ui/TextField";
import { SettingsCard } from "./SettingsCard";

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const ABOUT_MAX = 160;

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: () => i18n.t("auth.validation.nameMin") })
    .max(100, { error: () => i18n.t("auth.validation.nameMax") }),
  status_text: z
    .string()
    .trim()
    .max(ABOUT_MAX, { error: () => i18n.t("settings.profile.aboutMax", { max: formatNumber(ABOUT_MAX) }) }),
});

type FormValues = z.infer<typeof schema>;

/** Settings › Profile: photo, display name and about. */
export function ProfileSettings() {
  const { t } = useTranslation();
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
      toast.success(t("settings.profile.saved"));
    },
    onError: (error) => {
      const fields = getFieldErrors(error);
      if (fields.name) setError("name", { message: fields.name });
      if (fields.status_text) setError("status_text", { message: fields.status_text });
      if (!fields.name && !fields.status_text) toast.error(getErrorMessage(error, t("settings.profile.saveFailed")));
    },
  });

  const upload = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: (updated) => {
      updateUser(updated);
      refreshConversations();
      toast.success(t("settings.profile.photoUpdated"));
    },
    onError: (error) => toast.error(getErrorMessage(error, t("settings.profile.uploadFailed"))),
  });

  const remove = useMutation({
    mutationFn: removeAvatar,
    onSuccess: (updated) => {
      updateUser(updated);
      refreshConversations();
      toast.success(t("settings.profile.photoRemoved"));
    },
    onError: (error) => toast.error(getErrorMessage(error, t("settings.profile.removeFailed"))),
  });

  return (
    <SettingsCard>
      <div className="flex items-center gap-5">
        <div className="relative">
          <Avatar name={user?.name} src={user?.avatar} size="xl" />
          {upload.isPending && (
            <span className="absolute inset-0 grid place-items-center rounded-full bg-black/45">
              <Loader2 className="size-5 animate-spin text-white" aria-label={t("settings.profile.uploading")} />
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
              {user?.avatar ? t("settings.profile.changePhoto") : t("settings.profile.uploadPhoto")}
            </Button>
            {user?.avatar && (
              <Button variant="ghost" size="sm" onClick={() => remove.mutate()} loading={remove.isPending}>
                {t("settings.profile.remove")}
              </Button>
            )}
          </div>
          <p className="mt-2 text-xs text-fg-subtle">{t("settings.profile.photoHint")}</p>
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
              toast.error(t("settings.profile.photoTooBig"));
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
          label={t("settings.profile.displayName")}
          icon={UserRound}
          autoComplete="name"
          error={errors.name?.message}
          {...register("name")}
        />
        <TextField
          label={t("settings.profile.about")}
          placeholder={t("settings.profile.aboutPlaceholder")}
          maxLength={ABOUT_MAX}
          error={errors.status_text?.message}
          hint={t("settings.profile.aboutHint", { count: formatNumber(about.length), max: formatNumber(ABOUT_MAX) })}
          {...register("status_text")}
        />
        <div className="flex items-center gap-3">
          <Button type="submit" loading={save.isPending} disabled={!isDirty}>
            {t("common.save")}
          </Button>
          {isDirty && !save.isPending && (
            <Button variant="ghost" onClick={() => reset()}>
              {t("common.cancel")}
            </Button>
          )}
        </div>
      </form>
    </SettingsCard>
  );
}
