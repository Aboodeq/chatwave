import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowLeft, CircleCheck, Mail, MailCheck } from "lucide-react";
import { requestPasswordOtp, resetPasswordWithOtp, verifyPasswordOtp } from "../api/auth";
import { getErrorMessage, getFieldErrors, getRetryAfter } from "../lib/errors";
import { cn } from "../lib/utils";
import { useCountdown } from "../hooks/useCountdown";
import { AuthHeading, AuthLayout } from "../components/auth/AuthLayout";
import { PasswordStrength } from "../components/auth/PasswordStrength";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { OtpInput } from "../components/ui/OtpInput";
import { PasswordField } from "../components/ui/PasswordField";
import { TextField } from "../components/ui/TextField";
import { TextLink, textLinkStyles } from "../components/ui/TextLink";

type Step = "email" | "code" | "password" | "done";

/** Matches the server's cooldown between codes for the same address. */
const RESEND_SECONDS = 60;

export default function ForgotPasswordPage() {
  const location = useLocation();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState((location.state as { email?: string } | null)?.email ?? "");
  const [code, setCode] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [codeError, setCodeError] = useState<string | null>(null);

  const goToCode = (address: string, waitSeconds: number) => {
    setEmail(address);
    setCode("");
    setCodeError(null);
    setResendAt(Date.now() + waitSeconds * 1000);
    setStep("code");
  };

  return (
    <AuthLayout
      title={
        <>
          Locked out?
          <br />
          Let's fix that.
        </>
      }
      subtitle="We'll email you a 6‑digit code. It works once and expires after 10 minutes."
    >
      {step !== "done" && <Progress step={step} />}

      {step === "email" && <EmailStep initialEmail={email} onSent={goToCode} />}

      {step === "code" && (
        <CodeStep
          email={email}
          resendAt={resendAt}
          initialError={codeError}
          onResent={(waitSeconds) => setResendAt(Date.now() + waitSeconds * 1000)}
          onVerified={(verified) => {
            setCode(verified);
            setStep("password");
          }}
          onChangeEmail={() => setStep("email")}
        />
      )}

      {step === "password" && (
        <PasswordStep
          email={email}
          code={code}
          onDone={() => setStep("done")}
          onCodeRejected={(message) => {
            setCodeError(message);
            setCode("");
            setStep("code");
          }}
        />
      )}

      {step === "done" && <DoneStep email={email} />}
    </AuthLayout>
  );
}

function Progress({ step }: { step: Exclude<Step, "done"> }) {
  const index = ["email", "code", "password"].indexOf(step);

  return (
    <div className="mb-8 flex items-center gap-3">
      <div className="flex flex-1 gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn("h-1 flex-1 rounded-full transition-colors duration-500", i <= index ? "bg-primary" : "bg-surface-3")}
          />
        ))}
      </div>
      <span className="text-xs font-medium text-fg-subtle">Step {index + 1} of 3</span>
    </div>
  );
}

const emailSchema = z.object({
  email: z.string().trim().min(1, "Enter your email address.").pipe(z.email("Enter a valid email address.")),
});

function EmailStep({
  initialEmail,
  onSent,
}: {
  initialEmail: string;
  onSent: (email: string, waitSeconds: number) => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const [rateLimitedEmail, setRateLimitedEmail] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: initialEmail },
  });

  useEffect(() => {
    setFocus("email");
  }, [setFocus]);

  const mutation = useMutation({
    mutationFn: (email: string) => requestPasswordOtp({ email }),
    onSuccess: (_, email) => onSent(email, RESEND_SECONDS),
    onError: (error, email) => {
      setRateLimitedEmail(getRetryAfter(error) ? email : null);
      setFormError(getErrorMessage(error, "We couldn't send a code. Please try again."));
    },
  });

  return (
    <>
      <AuthHeading
        title="Reset your password"
        description="Enter the email you signed up with and we'll send you a verification code."
      />

      <form
        noValidate
        className="space-y-5"
        onSubmit={handleSubmit(({ email }) => {
          setFormError(null);
          mutation.mutate(email);
        })}
      >
        {formError && (
          <Alert>
            {formError}
            {rateLimitedEmail && (
              <button
                type="button"
                onClick={() => onSent(rateLimitedEmail, RESEND_SECONDS)}
                className={cn(textLinkStyles, "mt-1 block text-danger")}
              >
                I already have a code
              </button>
            )}
          </Alert>
        )}

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

        <Button type="submit" size="lg" loading={mutation.isPending} className="w-full">
          {mutation.isPending ? "Sending code…" : "Send code"}
        </Button>
      </form>

      <BackToSignIn />
    </>
  );
}

function CodeStep({
  email,
  resendAt,
  initialError,
  onResent,
  onVerified,
  onChangeEmail,
}: {
  email: string;
  resendAt: number;
  initialError: string | null;
  onResent: (waitSeconds: number) => void;
  onVerified: (code: string) => void;
  onChangeEmail: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  // Remounting the boxes clears them, refocuses the first one and replays the shake.
  const [attempt, setAttempt] = useState(0);
  const secondsLeft = useCountdown(resendAt);

  const verify = useMutation({
    mutationFn: (otp: string) => verifyPasswordOtp({ email, otp }),
    onSuccess: (_, otp) => onVerified(otp),
    onError: (err) => {
      setError(getErrorMessage(err, "That code didn't work. Please try again."));
      setCode("");
      setAttempt((a) => a + 1);
    },
  });

  const resend = useMutation({
    mutationFn: () => requestPasswordOtp({ email }),
    onSuccess: () => {
      onResent(RESEND_SECONDS);
      setError(null);
      setCode("");
      setAttempt((a) => a + 1);
      toast.success("We sent you a new code.");
    },
    onError: (err) => {
      const wait = getRetryAfter(err);
      if (wait) onResent(wait);
      setError(getErrorMessage(err, "We couldn't send a new code. Please try again."));
    },
  });

  const submit = (otp: string) => {
    if (otp.length < 6 || verify.isPending) return;
    setError(null);
    verify.mutate(otp);
  };

  return (
    <>
      <AuthHeading
        title="Check your inbox"
        description={
          <>
            If an account exists for <span className="font-medium text-fg">{email}</span>, we sent it a 6‑digit code.{" "}
            <button type="button" onClick={onChangeEmail} className={textLinkStyles}>
              Use a different email
            </button>
          </>
        }
      >
        <span className="mb-5 grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary-soft-fg">
          <MailCheck className="size-6" aria-hidden="true" />
        </span>
      </AuthHeading>

      <form
        noValidate
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (code.length < 6) {
            setError("Enter all 6 digits of the code.");
            setAttempt((a) => a + 1);
            return;
          }
          submit(code);
        }}
      >
        <div className="space-y-2">
          <OtpInput
            key={attempt}
            value={code}
            onChange={(value) => {
              setCode(value);
              if (error) setError(null);
            }}
            onComplete={submit}
            invalid={Boolean(error)}
            disabled={verify.isPending}
            autoFocus
            describedBy={error ? "otp-error" : undefined}
          />
          {error && (
            <p id="otp-error" role="alert" className="text-[0.8125rem] font-medium text-danger">
              {error}
            </p>
          )}
        </div>

        <Button type="submit" size="lg" loading={verify.isPending} className="w-full">
          {verify.isPending ? "Checking…" : "Verify code"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-fg-muted" aria-live="polite">
        Didn't get it? Check your spam folder, or{" "}
        {secondsLeft > 0 ? (
          <span className="font-medium text-fg-subtle tabular-nums">
            resend in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => resend.mutate()}
            disabled={resend.isPending}
            className={cn(textLinkStyles, "disabled:opacity-60")}
          >
            {resend.isPending ? "sending…" : "send a new code"}
          </button>
        )}
      </p>
    </>
  );
}

const passwordSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters.").max(72, "Use 72 characters or fewer."),
    password_confirmation: z.string().min(1, "Confirm your new password."),
  })
  .refine((values) => values.password === values.password_confirmation, {
    message: "Passwords don't match.",
    path: ["password_confirmation"],
  });

function PasswordStep({
  email,
  code,
  onDone,
  onCodeRejected,
}: {
  email: string;
  code: string;
  onDone: () => void;
  onCodeRejected: (message: string) => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", password_confirmation: "" },
  });
  const password = useWatch({ control, name: "password" });

  useEffect(() => {
    setFocus("password");
  }, [setFocus]);

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof passwordSchema>) => resetPasswordWithOtp({ email, otp: code, ...values }),
    onSuccess: onDone,
    onError: (error) => {
      const fields = getFieldErrors(error);
      if (fields.otp) {
        onCodeRejected(fields.otp);
      } else if (fields.password) {
        setError("password", { message: fields.password });
        setFocus("password");
      } else {
        setFormError(getErrorMessage(error, "We couldn't update your password. Please try again."));
      }
    },
  });

  return (
    <>
      <AuthHeading title="Choose a new password" description="Pick something you haven't used here before." />

      <form
        noValidate
        className="space-y-5"
        onSubmit={handleSubmit((values) => {
          setFormError(null);
          mutation.mutate(values);
        })}
      >
        {formError && <Alert>{formError}</Alert>}

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
          placeholder="Type it again"
          autoComplete="new-password"
          error={errors.password_confirmation?.message}
          {...register("password_confirmation")}
        />

        <Button type="submit" size="lg" loading={mutation.isPending} className="w-full">
          {mutation.isPending ? "Updating…" : "Update password"}
        </Button>
      </form>
    </>
  );
}

function DoneStep({ email }: { email: string }) {
  const navigate = useNavigate();

  return (
    <div>
      <span className="mb-6 grid size-14 animate-pop place-items-center rounded-2xl bg-success-soft text-success">
        <CircleCheck className="size-7" aria-hidden="true" />
      </span>
      <h1 className="font-display text-[1.875rem] leading-[1.15] font-semibold tracking-[-0.025em] sm:text-[2.25rem]">
        Password updated
      </h1>
      <p className="mt-3 text-base leading-relaxed text-fg-muted">
        For your security, you've been signed out everywhere. Sign in with your new password to continue.
      </p>
      <Button size="lg" className="mt-8 w-full" onClick={() => navigate("/login", { state: { email } })} autoFocus>
        Back to sign in
      </Button>
    </div>
  );
}

function BackToSignIn() {
  return (
    <p className="mt-8 text-sm">
      <TextLink to="/login" className="inline-flex items-center gap-1.5 text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to sign in
      </TextLink>
    </p>
  );
}
