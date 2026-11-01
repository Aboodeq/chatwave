import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowLeft, ArrowRight, Mail, MessageSquareText, UserRound } from "lucide-react";
import { register as registerAccount, requestRegistrationCode, type AuthResponse, type CodeSent } from "../api/auth";
import { useAuthStore } from "../stores/authStore";
import { getErrorMessage, getFieldErrors, getRetryAfter, getStatus } from "../lib/errors";
import { guessCountry } from "../lib/phoneCountry";
import { cn } from "../lib/utils";
import { Accent, AuthHeading, AuthLayout } from "../components/auth/AuthLayout";
import { MethodSwitch } from "../components/auth/MethodSwitch";
import { PasswordStrength } from "../components/auth/PasswordStrength";
import { VerificationCodeForm } from "../components/auth/VerificationCodeForm";
import {
  checkContact,
  contactFields,
  rememberContactMethod,
  resolveContact,
  savedContactMethod,
  type ContactMethod,
} from "../components/auth/contact";
import { sendWave } from "../components/auth/waveSignal";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { PasswordField } from "../components/ui/PasswordField";
import { PhoneField } from "../components/ui/LazyPhoneField";
import { TextField } from "../components/ui/TextField";
import { TextLink, textLinkStyles } from "../components/ui/TextLink";

const schema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters.").max(100, "Name is too long."),
    ...contactFields,
    password: z.string().min(8, "Use at least 8 characters.").max(72, "Use 72 characters or fewer."),
    password_confirmation: z.string().min(1, "Confirm your password."),
  })
  .superRefine((values, ctx) => {
    checkContact(values, ctx);
    if (values.password_confirmation && values.password !== values.password_confirmation) {
      ctx.addIssue({ code: "custom", path: ["password_confirmation"], message: "Passwords don't match." });
    }
  });

type FormValues = z.infer<typeof schema>;
const serverFields = ["name", "email", "phone", "password", "password_confirmation"] as const;

/** Matches the server's cooldown between codes for the same number. */
const RESEND_SECONDS = 60;

interface Verification {
  values: FormValues;
  /** E.164, for the API. */
  phone: string;
  /** "+962 7 9123 4567", for people. */
  display: string;
  resendAt: number;
  devCode?: string;
}

export default function RegisterPage() {
  const startSession = useAuthStore((s) => s.startSession);
  const [verification, setVerification] = useState<Verification | null>(null);
  // Kept so "Change number" returns to the form as it was.
  const [draft, setDraft] = useState<FormValues | undefined>(undefined);

  const welcome = (session: AuthResponse, method: ContactMethod) => {
    rememberContactMethod(method);
    sendWave(1.6);
    startSession(session, true);
    toast.success(`Welcome to ChatWave, ${session.user.name.split(" ")[0]}!`);
  };

  return (
    <AuthLayout
      headline={
        <>
          Your team is
          <br />
          one <Accent>wave</Accent> away.
        </>
      }
      intro="Sign up with your email or phone number and start talking with your team in under a minute."
    >
      {verification ? (
        <VerifyPhoneStep
          verification={verification}
          onResent={(sent) =>
            setVerification((current) =>
              current && { ...current, resendAt: Date.now() + RESEND_SECONDS * 1000, devCode: sent.dev_code },
            )
          }
          onBack={() => setVerification(null)}
          onCreated={(session) => welcome(session, "phone")}
        />
      ) : (
        <DetailsStep
          initialValues={draft}
          onCreated={(session) => welcome(session, "email")}
          onCodeSent={(values, phone, display, sent) => {
            setDraft(values);
            setVerification({ values, phone, display, resendAt: Date.now() + RESEND_SECONDS * 1000, devCode: sent.dev_code });
          }}
        />
      )}
    </AuthLayout>
  );
}

function DetailsStep({
  initialValues,
  onCreated,
  onCodeSent,
}: {
  initialValues: FormValues | undefined;
  onCreated: (session: AuthResponse) => void;
  onCodeSent: (values: FormValues, phone: string, display: string, sent: CodeSent) => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setError,
    setFocus,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues ?? {
      name: "",
      method: savedContactMethod(),
      email: "",
      phone: "",
      country: guessCountry(),
      password: "",
      password_confirmation: "",
    },
  });
  const [method, country, password] = useWatch({ control, name: ["method", "country", "password"] });
  // The phone field loads on demand, so it takes focus itself when it appears.
  const [focusPhone, setFocusPhone] = useState(false);

  useEffect(() => {
    setFocus("name");
  }, [setFocus]);

  const showErrors = (error: unknown, fallback: string) => {
    const fieldErrors = getFieldErrors(error);
    const known = serverFields.filter((field) => fieldErrors[field]);
    if (getStatus(error) === 422 && known.length > 0) {
      known.forEach((field) => setError(field, { message: fieldErrors[field] }));
      setFocus(known[0]);
      return;
    }
    setFormError(getErrorMessage(error, fallback));
  };

  const createWithEmail = useMutation({
    mutationFn: async (values: FormValues) => {
      const { contact } = await resolveContact(values);
      return registerAccount({
        name: values.name,
        ...contact,
        password: values.password,
        password_confirmation: values.password_confirmation,
      });
    },
    onSuccess: onCreated,
    onError: (error) => showErrors(error, "We couldn't create your account. Please try again."),
  });

  const sendCode = useMutation({
    mutationFn: async (values: FormValues) => {
      const { contact, display } = await resolveContact(values);
      const phone = "phone" in contact ? contact.phone : "";
      return { sent: await requestRegistrationCode(phone), phone, display };
    },
    onSuccess: ({ sent, phone, display }, values) => onCodeSent(values, phone, display, sent),
    onError: (error) => showErrors(error, "We couldn't text you a code. Please try again."),
  });

  const switchMethod = (next: ContactMethod, source: "pointer" | "keyboard") => {
    setValue("method", next);
    clearErrors(["email", "phone"]);
    setFormError(null);
    sendWave(0.8);
    // Clicking a method moves on to its field; arrow keys stay on the switch.
    setFocusPhone(source === "pointer" && next === "phone");
    if (source === "pointer" && next === "email") requestAnimationFrame(() => setFocus("email"));
  };

  const pending = createWithEmail.isPending || sendCode.isPending;

  return (
    <>
      <AuthHeading title="Create your account" description="Start chatting in less than a minute." />

      <form
        noValidate
        className="space-y-5"
        onSubmit={handleSubmit((values) => {
          setFormError(null);
          if (values.method === "phone") sendCode.mutate(values);
          else createWithEmail.mutate(values);
        })}
      >
        <MethodSwitch value={method} onChange={switchMethod} label="Sign up with" />

        {formError && <Alert>{formError}</Alert>}

        <TextField
          label="Full name"
          icon={UserRound}
          placeholder="Ada Lovelace"
          autoComplete="name"
          error={errors.name?.message}
          {...register("name")}
        />

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
                  hint="We'll text you a code to confirm it's yours."
                  autoFocus={focusPhone}
                />
              )}
            />
          )}
        </div>

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

        <Button type="submit" size="lg" loading={pending} className="group w-full">
          {pending ? (
            method === "phone" ? "Texting you a code…" : "Creating your account…"
          ) : (
            <>
              {method === "phone" ? "Continue" : "Create account"}
              <ArrowRight
                className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                aria-hidden="true"
              />
            </>
          )}
        </Button>
      </form>

      <p className="mt-7 border-t border-line pt-6 text-center text-sm text-fg-muted">
        Already have an account? <TextLink to="/login">Sign in</TextLink>
      </p>
    </>
  );
}

function VerifyPhoneStep({
  verification,
  onResent,
  onBack,
  onCreated,
}: {
  verification: Verification;
  onResent: (sent: CodeSent) => void;
  onBack: () => void;
  onCreated: (session: AuthResponse) => void;
}) {
  const { values, phone, display } = verification;
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: (otp: string) =>
      registerAccount({
        name: values.name,
        phone,
        otp,
        password: values.password,
        password_confirmation: values.password_confirmation,
      }),
    onSuccess: onCreated,
    onError: (err) => {
      const fields = getFieldErrors(err);
      if (fields.otp) {
        setError(fields.otp);
        setAttempt((n) => n + 1);
      } else if (getStatus(err) === 422) {
        // Something about the details changed since (e.g. the number was registered meanwhile).
        setDetailsError(getErrorMessage(err));
      } else {
        setError(getErrorMessage(err, "We couldn't create your account. Please try again."));
        setAttempt((n) => n + 1);
      }
    },
  });

  const resend = useMutation({
    mutationFn: () => requestRegistrationCode(phone),
    onSuccess: (sent) => {
      onResent(sent);
      setError(null);
      setAttempt((n) => n + 1);
      toast.success("We texted you a new code.");
    },
    onError: (err) => {
      setError(getErrorMessage(err, "We couldn't send a new code. Please try again."));
      if (getRetryAfter(err)) setAttempt((n) => n + 1);
    },
  });

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className={cn(textLinkStyles, "mb-6 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg")}
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        Change number
      </button>

      <AuthHeading
        title="Check your phone"
        description={
          <>
            We texted a 6‑digit code to <span className="font-medium whitespace-nowrap text-fg">{display}</span>.
            Enter it to create your account.
          </>
        }
      >
        <span className="mb-5 grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary-soft-fg">
          <MessageSquareText className="size-6" aria-hidden="true" />
        </span>
      </AuthHeading>

      {detailsError && (
        <Alert className="mb-5">
          {detailsError}{" "}
          <button type="button" onClick={onBack} className={cn(textLinkStyles, "text-danger")}>
            Go back
          </button>
        </Alert>
      )}

      <VerificationCodeForm
        onSubmit={(code) => create.mutate(code)}
        submitting={create.isPending}
        submitLabel="Verify and create account"
        submittingLabel="Creating your account…"
        error={error}
        attempt={attempt}
        resendAt={verification.resendAt}
        onResend={() => resend.mutate()}
        resending={resend.isPending}
        resendHint="Didn't get a text? Give it a minute, or"
        devCode={verification.devCode}
      />
    </>
  );
}
