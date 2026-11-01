import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Trans, useTranslation } from "react-i18next";
import { ArrowLeft, CircleCheck, Mail, MailCheck, MessageSquareText } from "lucide-react";
import i18n from "../i18n";
import { requestPasswordOtp, resetPasswordWithOtp, verifyPasswordOtp, type Contact } from "../api/auth";
import { getErrorMessage, getFieldErrors, getRetryAfter } from "../lib/errors";
import { guessCountry } from "../lib/phoneCountry";
import { cn, formatNumber } from "../lib/utils";
import { AuthHeading, AuthLayout } from "../components/auth/AuthLayout";
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
    <AuthLayout>
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
          onDone={() => setStep("done")}
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
  const { t } = useTranslation();
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
      <span className="text-xs font-medium text-fg-subtle">{t("auth.forgot.step", { n: formatNumber(index + 1), total: formatNumber(3) })}</span>
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
  const { t } = useTranslation();
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
    onError: (error) => setFormError(getErrorMessage(error, t("auth.forgot.contact.failed"))),
  });

  const switchMethod = (next: ContactMethod, source: "pointer" | "keyboard") => {
    setValue("method", next);
    clearErrors();
    setFormError(null);
    // Clicking a method moves on to its field; arrow keys stay on the switch.
    setFocusPhone(source === "pointer" && next === "phone");
    if (source === "pointer" && next === "email") requestAnimationFrame(() => setFocus("email"));
  };

  return (
    <>
      <AuthHeading title={t("auth.forgot.contact.title")} description={t("auth.forgot.contact.description")} />

      <form
        noValidate
        className="space-y-5"
        onSubmit={handleSubmit((values) => {
          setFormError(null);
          mutation.mutate(values);
        })}
      >
        <MethodSwitch value={method} onChange={switchMethod} label={t("auth.forgot.contact.method")} />

        {formError && (
          <Alert>
            {formError}
            {rateLimited && (
              <button
                type="button"
                onClick={() => onSent(rateLimited.values, rateLimited.destination, RESEND_SECONDS)}
                className={cn(textLinkStyles, "mt-1 block text-danger")}
              >
                {t("auth.forgot.contact.haveCode")}
              </button>
            )}
          </Alert>
        )}

        <div key={method} className="animate-fade-in">
          {method === "email" ? (
            <TextField
              label={t("auth.fields.email")}
              type="email"
              dir="ltr"
              icon={Mail}
              placeholder={t("auth.fields.emailPlaceholder")}
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
                  label={t("auth.fields.phone")}
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
          {mutation.isPending ? t("auth.forgot.contact.sending") : t("auth.forgot.contact.submit")}
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
  const { t } = useTranslation();
  const byPhone = "phone" in contact;
  const Icon = byPhone ? MessageSquareText : MailCheck;

  const verify = useMutation({
    mutationFn: (otp: string) => verifyPasswordOtp({ ...contact, otp }),
    onSuccess: (_, otp) => onVerified(otp),
    onError: (err) => onRejected(getErrorMessage(err, t("auth.code.failed"))),
  });

  const resend = useMutation({
    mutationFn: () => requestPasswordOtp(contact),
    onSuccess: () => {
      onResent(RESEND_SECONDS);
      toast.success(byPhone ? t("auth.forgot.code.resentPhone") : t("auth.forgot.code.resentEmail"));
    },
    onError: (err) => {
      const wait = getRetryAfter(err);
      if (wait) onResent(wait);
      onRejected(getErrorMessage(err, t("auth.code.resendFailed")));
    },
  });

  return (
    <>
      <AuthHeading
        title={byPhone ? t("auth.forgot.code.titlePhone") : t("auth.forgot.code.titleEmail")}
        description={
          <>
            <Trans
              i18nKey={byPhone ? "auth.forgot.code.descriptionPhone" : "auth.forgot.code.descriptionEmail"}
              values={{ contact: display }}
              components={{ contact: <span dir="ltr" className="font-medium whitespace-nowrap text-fg" /> }}
            />{" "}
            <button type="button" onClick={onChangeContact} className={textLinkStyles}>
              {t("auth.forgot.code.useOther")}
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
        submitLabel={t("auth.forgot.code.submit")}
        submittingLabel={t("auth.forgot.code.checking")}
        error={error}
        attempt={attempt}
        resendAt={resendAt}
        onResend={() => resend.mutate()}
        resending={resend.isPending}
        resendHint={byPhone ? t("auth.forgot.code.resendHintPhone") : t("auth.forgot.code.resendHintEmail")}
      />
    </>
  );
}

const passwordSchema = z
  .object({
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
  const { t } = useTranslation();
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
        setFormError(getErrorMessage(error, t("auth.forgot.password.failed")));
      }
    },
  });

  return (
    <>
      <AuthHeading title={t("auth.forgot.password.title")} description={t("auth.forgot.password.description")} />

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
          label={t("auth.forgot.password.new")}
          placeholder={t("auth.password.newPlaceholder")}
          autoComplete="new-password"
          error={errors.password?.message}
          hint={password ? <PasswordStrength password={password} /> : t("auth.password.hint")}
          {...register("password")}
        />

        <PasswordField
          label={t("auth.forgot.password.confirm")}
          placeholder={t("auth.password.again")}
          autoComplete="new-password"
          error={errors.password_confirmation?.message}
          {...register("password_confirmation")}
        />

        <Button type="submit" size="lg" loading={mutation.isPending} className="w-full">
          {mutation.isPending ? t("auth.forgot.password.updating") : t("auth.forgot.password.submit")}
        </Button>
      </form>
    </>
  );
}

function DoneStep({ values }: { values: ContactValues }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div>
      <span className="mb-6 grid size-14 animate-pop place-items-center rounded-2xl bg-success-soft text-success">
        <CircleCheck className="size-7" aria-hidden="true" />
      </span>
      <h1 className="font-display text-[1.75rem] leading-[1.15] font-semibold tracking-[-0.03em] sm:text-[2rem]">
        {t("auth.forgot.done.title")}
      </h1>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-fg-muted">{t("auth.forgot.done.description")}</p>
      <Button
        size="lg"
        className="mt-8 w-full"
        onClick={() => navigate("/login", { state: values satisfies LoginPrefill })}
        autoFocus
      >
        {t("auth.forgot.done.back")}
      </Button>
    </div>
  );
}

function BackToSignIn() {
  const { t } = useTranslation();
  return (
    <p className="mt-7 border-t border-line pt-6 text-center text-sm">
      <TextLink to="/login" className="inline-flex items-center gap-1.5 text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        {t("auth.forgot.backToSignIn")}
      </TextLink>
    </p>
  );
}
