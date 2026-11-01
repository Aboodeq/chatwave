import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Mail, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";
import { changePassword } from "../../api/profile";
import { signInIdentifier } from "../../lib/account";
import { getErrorMessage, getFieldErrors } from "../../lib/errors";
import { useAuthStore } from "../../stores/authStore";
import { PasswordStrength } from "../auth/PasswordStrength";
import { Button } from "../ui/Button";
import { PasswordField } from "../ui/PasswordField";
import { SettingsCard } from "./SettingsCard";

const schema = z
  .object({
    current_password: z.string().min(1, { error: () => i18n.t("settings.account.currentRequired") }),
    password: z
      .string()
      .min(8, { error: () => i18n.t("auth.validation.passwordMin") })
      .max(72, { error: () => i18n.t("auth.validation.passwordMax") }),
    password_confirmation: z.string().min(1, { error: () => i18n.t("auth.validation.confirmNewRequired") }),
  })
  .refine((values) => values.password === values.password_confirmation, {
    error: () => i18n.t("auth.validation.mismatch"),
    path: ["password_confirmation"],
  });

type FormValues = z.infer<typeof schema>;
const fields = ["current_password", "password", "password_confirmation"] as const;

/** Settings › Account: the sign-in email and changing the password. */
export function AccountSettings() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { current_password: "", password: "", password_confirmation: "" },
  });
  const password = useWatch({ control, name: "password" });

  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: ({ signed_out_sessions: count }) => {
      reset();
      void queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success(count > 0 ? t("settings.account.updatedSignedOut", { count }) : t("settings.account.updated"));
    },
    onError: (error) => {
      const fieldErrors = getFieldErrors(error);
      const known = fields.filter((field) => fieldErrors[field]);
      known.forEach((field) => setError(field, { message: fieldErrors[field] }));
      if (known.length === 0) toast.error(getErrorMessage(error, t("settings.account.failed")));
    },
  });

  return (
    <>
      <SettingsCard
        title={user?.email ? t("settings.account.email") : t("settings.account.phone")}
        description={user?.email ? t("settings.account.emailDescription") : t("settings.account.phoneDescription")}
      >
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-fg-muted">
            {user?.email ? <Mail className="size-5" aria-hidden="true" /> : <Smartphone className="size-5" aria-hidden="true" />}
          </span>
          <p dir="ltr" className="min-w-0 truncate text-[0.9375rem] font-medium text-fg tabular-nums">
            {signInIdentifier(user)}
          </p>
        </div>
      </SettingsCard>

      <SettingsCard
        title={t("settings.account.changePassword")}
        description={t("settings.account.changePasswordDescription")}
      >
        <form noValidate className="space-y-5" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          {/* Lets password managers file the new password under the right account. */}
          <input type="text" name="username" autoComplete="username" value={user?.email ?? user?.phone ?? ""} readOnly hidden />
          <PasswordField
            label={t("settings.account.current")}
            autoComplete="current-password"
            error={errors.current_password?.message}
            {...register("current_password")}
          />
          <PasswordField
            label={t("settings.account.new")}
            placeholder={t("auth.password.newPlaceholder")}
            autoComplete="new-password"
            error={errors.password?.message}
            hint={password ? <PasswordStrength password={password} /> : t("auth.password.hint")}
            {...register("password")}
          />
          <PasswordField
            label={t("settings.account.confirm")}
            autoComplete="new-password"
            error={errors.password_confirmation?.message}
            {...register("password_confirmation")}
          />
          <Button type="submit" loading={mutation.isPending}>
            {t("settings.account.submit")}
          </Button>
        </form>
      </SettingsCard>
    </>
  );
}
