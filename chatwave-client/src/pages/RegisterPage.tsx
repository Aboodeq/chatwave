import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Mail, UserRound } from "lucide-react";
import { register as registerAccount } from "../api/auth";
import { useAuthStore } from "../stores/authStore";
import { getErrorMessage, getFieldErrors, getStatus } from "../lib/errors";
import { AuthHeading, AuthLayout } from "../components/auth/AuthLayout";
import { PasswordStrength } from "../components/auth/PasswordStrength";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { PasswordField } from "../components/ui/PasswordField";
import { TextField } from "../components/ui/TextField";
import { TextLink } from "../components/ui/TextLink";

const schema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters.").max(100, "Name is too long."),
    email: z.string().trim().min(1, "Enter your email address.").pipe(z.email("Enter a valid email address.")),
    password: z.string().min(8, "Use at least 8 characters.").max(72, "Use 72 characters or fewer."),
    password_confirmation: z.string().min(1, "Confirm your password."),
  })
  .refine((values) => values.password === values.password_confirmation, {
    message: "Passwords don't match.",
    path: ["password_confirmation"],
  });

type FormValues = z.infer<typeof schema>;
const fields = ["name", "email", "password", "password_confirmation"] as const;

export default function RegisterPage() {
  const startSession = useAuthStore((s) => s.startSession);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", password_confirmation: "" },
  });
  const password = useWatch({ control, name: "password" });

  useEffect(() => {
    setFocus("name");
  }, [setFocus]);

  const mutation = useMutation({
    mutationFn: registerAccount,
    onSuccess: (session) => {
      startSession(session, true);
      toast.success(`Welcome to ChatWave, ${session.user.name.split(" ")[0]}!`);
    },
    onError: (error) => {
      const fieldErrors = getFieldErrors(error);
      const known = fields.filter((field) => fieldErrors[field]);

      if (getStatus(error) === 422 && known.length > 0) {
        known.forEach((field) => setError(field, { message: fieldErrors[field] }));
        setFocus(known[0]);
        return;
      }
      setFormError(getErrorMessage(error, "We couldn't create your account. Please try again."));
    },
  });

  return (
    <AuthLayout
      title={
        <>
          Say hello
          <br />
          to your team.
        </>
      }
      subtitle="Create an account, find a teammate by name or email, and start talking."
    >
      <AuthHeading title="Create your account" description="Start chatting in less than a minute." />

      <form
        noValidate
        className="space-y-5"
        onSubmit={handleSubmit((values) => {
          setFormError(null);
          mutation.mutate(values);
        })}
      >
        {formError && <Alert>{formError}</Alert>}

        <TextField
          label="Full name"
          icon={UserRound}
          placeholder="Ada Lovelace"
          autoComplete="name"
          error={errors.name?.message}
          {...register("name")}
        />

        <TextField
          label="Email"
          type="email"
          icon={Mail}
          placeholder="you@company.com"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          error={errors.email?.message}
          {...register("email")}
        />

        <PasswordField
          label="Password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          error={errors.password?.message}
          hint={password ? <PasswordStrength password={password} /> : "Use 8 or more characters. Longer is stronger."}
          {...register("password")}
        />

        <PasswordField
          label="Confirm password"
          placeholder="Type it again"
          autoComplete="new-password"
          error={errors.password_confirmation?.message}
          {...register("password_confirmation")}
        />

        <Button type="submit" size="lg" loading={mutation.isPending} className="w-full">
          {mutation.isPending ? "Creating your account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-8 text-sm text-fg-muted">
        Already have an account? <TextLink to="/login">Sign in</TextLink>
      </p>
    </AuthLayout>
  );
}
