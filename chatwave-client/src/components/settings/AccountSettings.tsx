import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Mail, Smartphone } from "lucide-react";
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
    current_password: z.string().min(1, "Enter your current password."),
    password: z.string().min(8, "Use at least 8 characters.").max(72, "Use 72 characters or fewer."),
    password_confirmation: z.string().min(1, "Confirm your new password."),
  })
  .refine((values) => values.password === values.password_confirmation, {
    message: "Passwords don't match.",
    path: ["password_confirmation"],
  });

type FormValues = z.infer<typeof schema>;
const fields = ["current_password", "password", "password_confirmation"] as const;

/** Settings › Account: the sign-in email and changing the password. */
export function AccountSettings() {
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
      toast.success(
        count > 0
          ? `Password updated. Signed out of ${count} other ${count === 1 ? "device" : "devices"}.`
          : "Password updated.",
      );
    },
    onError: (error) => {
      const fieldErrors = getFieldErrors(error);
      const known = fields.filter((field) => fieldErrors[field]);
      known.forEach((field) => setError(field, { message: fieldErrors[field] }));
      if (known.length === 0) toast.error(getErrorMessage(error, "Your password wasn't changed."));
    },
  });

  return (
    <>
      <SettingsCard
        title={user?.email ? "Email" : "Phone number"}
        description={`You use this ${user?.email ? "address" : "number"} to sign in. Only you can see it.`}
      >
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-fg-muted">
            {user?.email ? <Mail className="size-5" aria-hidden="true" /> : <Smartphone className="size-5" aria-hidden="true" />}
          </span>
          <p className="min-w-0 truncate text-[0.9375rem] font-medium text-fg tabular-nums">{signInIdentifier(user)}</p>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Change password"
        description="You'll stay signed in here. Your other devices will be signed out."
      >
        <form noValidate className="space-y-5" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          {/* Lets password managers file the new password under the right account. */}
          <input type="text" name="username" autoComplete="username" value={user?.email ?? user?.phone ?? ""} readOnly hidden />
          <PasswordField
            label="Current password"
            autoComplete="current-password"
            error={errors.current_password?.message}
            {...register("current_password")}
          />
          <PasswordField
            label="New password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            error={errors.password?.message}
            hint={password ? <PasswordStrength password={password} /> : "Use 8 or more characters. Longer is stronger."}
            {...register("password")}
          />
          <PasswordField
            label="Confirm new password"
            autoComplete="new-password"
            error={errors.password_confirmation?.message}
            {...register("password_confirmation")}
          />
          <Button type="submit" loading={mutation.isPending}>
            Update password
          </Button>
        </form>
      </SettingsCard>
    </>
  );
}
