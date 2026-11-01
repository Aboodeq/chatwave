import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowLeft, CircleCheck, Mail, MailCheck, MessageSquareText } from "lucide-react";
import { requestPasswordOtp, resetPasswordWithOtp, verifyPasswordOtp, type Contact } from "../api/auth";
import { getErrorMessage, getFieldErrors, getRetryAfter } from "../lib/errors";
import { guessCountry } from "../lib/phoneCountry";
import { cn } from "../lib/utils";
import { Accent, AuthHeading, AuthLayout } from "../components/auth/AuthLayout";
import { MethodSwitch } from "../components/auth/MethodSwitch";
import { PasswordStrength } from "../components/auth/PasswordStrength";
import { VerificationCodeForm } from "../components/auth/VerificationCodeForm";
import {
  checkContact,
  contactFields,
  resolveContact,
  savedContactMethod,
  type ContactMethod,
  type ContactValues,
} from "../components/auth/contact";
import { sendWave } from "../components/auth/waveSignal";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { PasswordField } from "../components/ui/PasswordField";
import { PhoneField } from "../components/ui/LazyPhoneField";
import { TextField } from "../components/ui/TextField";
import { TextLink, textLinkStyles } from "../components/ui/TextLink";
import type { LoginPrefill } from "./LoginPage";

type Step = "contact" | "code" | "password" | "done";

/** Matches the server's cooldown between codes for the same address or number. */
const RESEND_SECONDS = 60;

export default function ForgotPasswordPage() {
  const location = useLocation();
  const prefill = (location.state as LoginPrefill | null) ?? {};
  const [step, setStep] = useState<Step>("contact");
  const [values, setValues] = useState<ContactValues>({
    method: prefill.method ?? savedContactMethod(),
    email: prefill.email ?? "",
    phone: prefill.phone ?? "",
    country: prefill.country ?? guessCountry(),
  });
  const [code, setCode] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  // Where the code went: { email } or { phone } for the API, and how to show it.
  const [sentTo, setSentTo] = useState<{ contact: Contact; display: string } | null>(null);

  const goToCode = (next: ContactValues, destination: { contact: Contact; display: string }, waitSeconds: number) => {
    setValues(next);
    setSentTo(destination);
    setCode("");
    setCodeError(null);
    setResendAt(Date.now() + waitSeconds * 1000);
    setStep("code");
  };

  return (
    <AuthLayout
      headline={
        <>
          Back in
          <br />
          one <Accent>wave.</Accent>
        </>
      }
      intro="We'll send a 6‑digit code to your email or phone. It works once and expires after 10 minutes."
    >
      {step !== "done" && <Progress step={step} />}

      {step === "contact" && <ContactStep initialValues={values} onSent={goToCode} />}

      {step === "code" && sentTo && (
        <CodeStep
          contact={sentTo.contact}
          display={sentTo.display}
          resendAt={resendAt}
          error={codeError}
          attempt={attempt}
          onRejected={(message) => {
            setCodeError(message);
            setAttempt((n) => n + 1);
          }}
          onResent={(waitSeconds) => setResendAt(Date.now() + waitSeconds * 1000)}
          onVerified={(verified) => {
            setCode(verified);
            setStep("password");
          }}
          onChangeContact={() => setStep("contact")}
        />
      )}

      {step === "password" && sentTo && (
        <PasswordStep
          contact={sentTo.contact}
          code={code}
          onDone={() => {
            sendWave(1.6);
            setStep("done");
          }}
          onCodeRejected={(message) => {
            setCodeError(message);
            setAttempt((n) => n + 1);
            setCode("");
            setStep("code");
          }}
        />
      )}

      {step === "done" && <DoneStep values={values} />}
    </AuthLayout>
  );
}

function Progress({ step }: { step: Exclude<Step, "done"> }) {
  const index = ["contact", "code", "password"].indexOf(step);

  return (
    <div className="mb-7 flex items-center gap-3">
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

const contactSchema = z.object(contactFields).superRefine(checkContact);

function ContactStep({
  initialValues,
  onSent,
}: {
  initialValues: ContactValues;
  onSent: (values: ContactValues, destination: { contact: Contact; display: string }, waitSeconds: number) => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState<{ values: ContactValues; destination: { contact: Contact; display: string } } | null>(null);
  const {
    register,
    handleSubmit,
    control,
    setFocus,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<ContactValues>({ resolver: zodResolver(contactSchema), defaultValues: initialValues });
  const [method, country] = useWatch({ control, name: ["method", "country"] });
  // The phone field loads on demand, so it takes focus itself when it appears.
  const [focusPhone, setFocusPhone] = useState(initialValues.method === "phone");

  useEffect(() => {
    setFocus(initialValues.method);
  }, [initialValues.method, setFocus]);

  const mutation = useMutation({
    mutationFn: async (values: ContactValues) => {
      const destination = await resolveContact(values);
      try {
        await requestPasswordOtp(destination.contact);
      } catch (error) {
        // Let "I already have a code" continue with this address after a rate limit.
        setRateLimited(getRetryAfter(error) ? { values, destination } : null);
        throw error;
      }
      return destination;
    },
    onSuccess: (destination, values) => onSent(values, destination, RESEND_SECONDS),
    onError: (error) => setFormError(getErrorMessage(error, "We couldn't send a code. Please try again.")),
  });

  const switchMethod = (next: ContactMethod, source: "pointer" | "keyboard") => {
    setValue("method", next);
    clearErrors();
    setFormError(null);
    sendWave(0.8);
    // Clicking a method moves on to its field; arrow keys stay on the switch.
    setFocusPhone(source === "pointer" && next === "phone");
    if (source === "pointer" && next === "email") requestAnimationFrame(() => setFocus("email"));
  };

  return (
    <>
      <AuthHeading
        title="Reset your password"
        description="Enter the email address or phone number you signed up with, and we'll send you a code."
      />

      <form
        noValidate
        className="space-y-5"
        onSubmit={handleSubmit((values) => {
          setFormError(null);
          mutation.mutate(values);
        })}
      >
        <MethodSwitch value={method} onChange={switchMethod} label="Reset with" />

        {formError && (
          <Alert>
            {formError}
            {rateLimited && (
              <button
                type="button"
                onClick={() => onSent(rateLimited.values, rateLimited.destination, RESEND_SECONDS)}
                className={cn(textLinkStyles, "mt-1 block text-danger")}
              >
                I already have a code
              </button>
            )}
          </Alert>
        )}

        <div key={method} className="animate-fade-in">
          {method === "email" ? (
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
          ) : (
            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <PhoneField
                  label="Phone number"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                  name={field.name}
                  country={country}
                  onCountryChange={(code) => setValue("country", code)}
                  error={errors.phone?.message}
                  autoFocus={focusPhone}
                />
              )}
            />
          )}
        </div>

        <Button type="submit" size="lg" loading={mutation.isPending} className="w-full">
          {mutation.isPending ? "Sending code…" : "Send code"}
        </Button>
      </form>

      <BackToSignIn />
    </>
  );
}

function CodeStep({
  contact,
  display,
  resendAt,
  error,
  attempt,
  onRejected,
  onResent,
  onVerified,
  onChangeContact,
}: {
  contact: Contact;
  display: string;
  resendAt: number;
  error: string | null;
  attempt: number;
  onRejected: (message: string) => void;
  onResent: (waitSeconds: number) => void;
  onVerified: (code: string) => void;
  onChangeContact: () => void;
}) {
  const byPhone = "phone" in contact;
  const Icon = byPhone ? MessageSquareText : MailCheck;

  const verify = useMutation({
    mutationFn: (otp: string) => verifyPasswordOtp({ ...contact, otp }),
    onSuccess: (_, otp) => onVerified(otp),
    onError: (err) => onRejected(getErrorMessage(err, "That code didn't work. Please try again.")),
  });

  const resend = useMutation({
    mutationFn: () => requestPasswordOtp(contact),
    onSuccess: () => {
      onResent(RESEND_SECONDS);
      toast.success(byPhone ? "We texted you a new code." : "We sent you a new code.");
    },
    onError: (err) => {
      const wait = getRetryAfter(err);
      if (wait) onResent(wait);
      onRejected(getErrorMessage(err, "We couldn't send a new code. Please try again."));
    },
  });

  return (
    <>
      <AuthHeading
        title={byPhone ? "Check your phone" : "Check your inbox"}
        description={
          <>
            If an account uses <span className="font-medium whitespace-nowrap text-fg">{display}</span>, we{" "}
            {byPhone ? "texted" : "sent"} it a 6‑digit code.{" "}
            <button type="button" onClick={onChangeContact} className={textLinkStyles}>
              Use something else
            </button>
          </>
        }
      >
        <span className="mb-5 grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary-soft-fg">
          <Icon className="size-6" aria-hidden="true" />
        </span>
      </AuthHeading>

      <VerificationCodeForm
        onSubmit={(otp) => verify.mutate(otp)}
        submitting={verify.isPending}
        submitLabel="Verify code"
        submittingLabel="Checking…"
        error={error}
        attempt={attempt}
        resendAt={resendAt}
        onResend={() => resend.mutate()}
        resending={resend.isPending}
        resendHint={byPhone ? "Didn't get a text? Give it a minute, or" : "Didn't get it? Check your spam folder, or"}
      />
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
  contact,
  code,
  onDone,
  onCodeRejected,
}: {
  contact: Contact;
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
    mutationFn: (values: z.infer<typeof passwordSchema>) => resetPasswordWithOtp({ ...contact, otp: code, ...values }),
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

function DoneStep({ values }: { values: ContactValues }) {
  const navigate = useNavigate();

  return (
    <div>
      <span className="mb-6 grid size-14 animate-pop place-items-center rounded-2xl bg-success-soft text-success">
        <CircleCheck className="size-7" aria-hidden="true" />
      </span>
      <h1 className="font-display text-[1.75rem] leading-[1.15] font-semibold tracking-[-0.03em] sm:text-[2rem]">
        Password updated
      </h1>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-fg-muted">
        For your security, you've been signed out everywhere. Sign in with your new password to continue.
      </p>
      <Button
        size="lg"
        className="mt-8 w-full"
        onClick={() => navigate("/login", { state: values satisfies LoginPrefill })}
        autoFocus
      >
        Back to sign in
      </Button>
    </div>
  );
}

function BackToSignIn() {
  return (
    <p className="mt-7 border-t border-line pt-6 text-center text-sm">
      <TextLink to="/login" className="inline-flex items-center gap-1.5 text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        Back to sign in
      </TextLink>
    </p>
  );
}
