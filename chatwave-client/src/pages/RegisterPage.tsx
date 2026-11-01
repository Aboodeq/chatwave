import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Trans, useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Mail, MessageSquareText, UserRound } from "lucide-react";
import i18n from "../i18n";
import { register as registerAccount, requestRegistrationCode, type AuthResponse, type CodeSent } from "../api/auth";
import { useAuthStore } from "../stores/authStore";
import { getErrorMessage, getFieldErrors, getRetryAfter, getStatus } from "../lib/errors";
import { guessCountry } from "../lib/phoneCountry";
import { cn } from "../lib/utils";
import { AuthHeading, AuthLayout } from "../components/auth/AuthLayout";
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
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { PasswordField } from "../components/ui/PasswordField";
import { PhoneField } from "../components/ui/LazyPhoneField";
import { TextField } from "../components/ui/TextField";
import { TextLink, textLinkStyles } from "../components/ui/TextLink";

const schema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { error: () => i18n.t("auth.validation.nameMin") })
      .max(100, { error: () => i18n.t("auth.validation.nameMax") }),
    ...contactFields,
    password: z
      .string()
      .min(8, { error: () => i18n.t("auth.validation.passwordMin") })
      .max(72, { error: () => i18n.t("auth.validation.passwordMax") }),
    password_confirmation: z.string().min(1, { error: () => i18n.t("auth.validation.confirmRequired") }),
  })
  .superRefine(async (values, ctx) => {
    if (values.password_confirmation && values.password !== values.password_confirmation) {
      ctx.addIssue({ code: "custom", path: ["password_confirmation"], message: i18n.t("auth.validation.mismatch") });
    }
    await checkContact(values, ctx);
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
  const { t } = useTranslation();
  const startSession = useAuthStore((s) => s.startSession);
  const [verification, setVerification] = useState<Verification | null>(null);
  // Kept so "Change number" returns to the form as it was.
  const [draft, setDraft] = useState<FormValues | undefined>(undefined);

  const welcome = (session: AuthResponse, method: ContactMethod) => {
    rememberContactMethod(method);
    startSession(session, true);
    toast.success(t("auth.register.welcome", { name: session.user.name.split(" ")[0] }));
  };

  return (
    <AuthLayout>
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
  const { t } = useTranslation();
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
    onError: (error) => showErrors(error, t("auth.register.failed")),
  });

  const sendCode = useMutation({
    mutationFn: async (values: FormValues) => {
      const { contact, display } = await resolveContact(values);
      const phone = "phone" in contact ? contact.phone : "";
      return { sent: await requestRegistrationCode(phone), phone, display };
    },
    onSuccess: ({ sent, phone, display }, values) => onCodeSent(values, phone, display, sent),
    onError: (error) => showErrors(error, t("auth.register.textFailed")),
  });

  const switchMethod = (next: ContactMethod, source: "pointer" | "keyboard") => {
    setValue("method", next);
    clearErrors(["email", "phone"]);
    setFormError(null);
    // Clicking a method moves on to its field; arrow keys stay on the switch.
    setFocusPhone(source === "pointer" && next === "phone");
    if (source === "pointer" && next === "email") requestAnimationFrame(() => setFocus("email"));
  };

  const pending = createWithEmail.isPending || sendCode.isPending;

  return (
    <>
      <AuthHeading title={t("auth.register.title")} description={t("auth.register.description")} />

      <form
        noValidate
        className="space-y-5"
        onSubmit={handleSubmit((values) => {
          setFormError(null);
          if (values.method === "phone") sendCode.mutate(values);
          else createWithEmail.mutate(values);
        })}
      >
        <MethodSwitch value={method} onChange={switchMethod} label={t("auth.register.method")} />

        {formError && <Alert>{formError}</Alert>}

        <TextField
          label={t("auth.fields.name")}
          icon={UserRound}
          placeholder={t("auth.fields.namePlaceholder")}
          autoComplete="name"
          error={errors.name?.message}
          {...register("name")}
        />

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
                  hint={t("auth.register.phoneHint")}
                  autoFocus={focusPhone}
                />
              )}
            />
          )}
        </div>

        <PasswordField
          label={t("auth.fields.password")}
          placeholder={t("auth.password.newPlaceholder")}
          autoComplete="new-password"
          error={errors.password?.message}
          hint={password ? <PasswordStrength password={password} /> : t("auth.password.hint")}
          {...register("password")}
        />

        <PasswordField
          label={t("auth.register.confirm")}
          placeholder={t("auth.password.again")}
          autoComplete="new-password"
          error={errors.password_confirmation?.message}
          {...register("password_confirmation")}
        />

        <Button type="submit" size="lg" loading={pending} className="group w-full">
          {pending ? (
            method === "phone" ? t("auth.register.texting") : t("auth.register.creating")
          ) : (
            <>
              {method === "phone" ? t("auth.register.submitPhone") : t("auth.register.submitEmail")}
              <ArrowRight
                className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                aria-hidden="true"
              />
            </>
          )}
        </Button>
      </form>

      <p className="mt-7 border-t border-line pt-6 text-center text-sm text-fg-muted">
        {t("auth.register.haveAccount")} <TextLink to="/login">{t("auth.register.signIn")}</TextLink>
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
  const { t } = useTranslation();
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
        setError(getErrorMessage(err, t("auth.register.failed")));
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
      toast.success(t("auth.register.verify.resent"));
    },
    onError: (err) => {
      setError(getErrorMessage(err, t("auth.code.resendFailed")));
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
        {t("auth.register.verify.changeNumber")}
      </button>

      <AuthHeading
        title={t("auth.register.verify.title")}
        description={
          <Trans
            i18nKey="auth.register.verify.description"
            values={{ phone: display }}
            components={{ phone: <span dir="ltr" className="font-medium whitespace-nowrap text-fg" /> }}
          />
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
            {t("auth.register.verify.goBack")}
          </button>
        </Alert>
      )}

      <VerificationCodeForm
        onSubmit={(code) => create.mutate(code)}
        submitting={create.isPending}
        submitLabel={t("auth.register.verify.submit")}
        submittingLabel={t("auth.register.creating")}
        error={error}
        attempt={attempt}
        resendAt={verification.resendAt}
        onResend={() => resend.mutate()}
        resending={resend.isPending}
        resendHint={t("auth.register.verify.resendHint")}
        devCode={verification.devCode}
      />
    </>
  );
}
