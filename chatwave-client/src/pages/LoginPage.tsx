import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Mail } from "lucide-react";
import { login } from "../api/auth";
import { useAuthStore } from "../stores/authStore";
import { getErrorMessage } from "../lib/errors";
import { AuthHeading, AuthLayout } from "../components/auth/AuthLayout";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { Checkbox } from "../components/ui/Checkbox";
import { PasswordField } from "../components/ui/PasswordField";
import { TextField } from "../components/ui/TextField";
import { TextLink } from "../components/ui/TextLink";

const schema = z.object({
  email: z.string().trim().min(1, "Enter your email address.").pipe(z.email("Enter a valid email address.")),
  // No length rule here: that's for choosing a password, not for entering one.
  password: z.string().min(1, "Enter your password."),
  remember: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const location = useLocation();
  const startSession = useAuthStore((s) => s.startSession);
  const [formError, setFormError] = useState<string | null>(null);
  const prefilledEmail = (location.state as { email?: string } | null)?.email ?? "";

  const {
    register,
    handleSubmit,
    control,
    setFocus,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: prefilledEmail, password: "", remember: false },
  });
  const email = useWatch({ control, name: "email" });

  useEffect(() => {
    setFocus(prefilledEmail ? "password" : "email");
  }, [prefilledEmail, setFocus]);

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (session, { remember }) => {
      // The route guard takes it from here and opens the chat.
      startSession(session, remember);
      toast.success(`Welcome back, ${session.user.name.split(" ")[0]}!`);
    },
    onError: (error) => {
      setFormError(getErrorMessage(error, "We couldn't sign you in. Please try again."));
      setFocus("password");
    },
  });

  return (
    <AuthLayout
      title={
        <>
          Conversations
          <br />
          that flow.
        </>
      }
      subtitle="Private chats, replies and unread counts that stay in sync, in a calm space built for focus."
    >
      <AuthHeading title="Welcome back" description="Sign in to pick up your conversations where you left off." />

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
          placeholder="Your password"
          autoComplete="current-password"
          error={errors.password?.message}
          labelAction={
            <TextLink to="/forgot-password" state={{ email }} className="text-[0.8125rem]">
              Forgot password?
            </TextLink>
          }
          {...register("password")}
        />

        <Checkbox label="Keep me signed in for 30 days" {...register("remember")} />

        <Button type="submit" size="lg" loading={mutation.isPending} className="w-full">
          {mutation.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-8 text-sm text-fg-muted">
        New to ChatWave? <TextLink to="/register">Create an account</TextLink>
      </p>
    </AuthLayout>
  );
}
