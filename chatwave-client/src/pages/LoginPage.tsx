import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { ArrowRight, Mail } from "lucide-react";
import i18n from "../i18n";
import { login } from "../api/auth";
import { useAuthStore } from "../stores/authStore";
import { getErrorMessage } from "../lib/errors";
import type { CountryCode } from "../lib/phone";
import { guessCountry } from "../lib/phoneCountry";
import { AuthHeading, AuthLayout } from "../components/auth/AuthLayout";
import { MethodSwitch } from "../components/auth/MethodSwitch";
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
import { Checkbox } from "../components/ui/Checkbox";
import { PasswordField } from "../components/ui/PasswordField";
import { PhoneField } from "../components/ui/LazyPhoneField";
import { TextField } from "../components/ui/TextField";
import { TextLink } from "../components/ui/TextLink";

const schema = z
  .object({
    ...contactFields,
    // No length rule here: that's for choosing a password, not for entering one.
    password: z.string().min(1, { error: () => i18n.t("auth.validation.passwordRequired") }),
    remember: z.boolean(),
  })
  .superRefine(checkContact);

type FormValues = z.infer<typeof schema>;

/** Where other auth pages can send people back with their details filled in. */
export interface LoginPrefill {
  method?: ContactMethod;
  email?: string;
  phone?: string;
  country?: CountryCode;
}

export default function LoginPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const startSession = useAuthStore((s) => s.startSession);
  const suspended = useAuthStore((s) => s.endedBy === "suspended");
  const prefill = (location.state as LoginPrefill | null) ?? {};
  const [formError, setFormError] = useState<string | null>(suspended ? t("auth.login.suspended") : null);

  const {
    register,
    handleSubmit,
    control,
    setFocus,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      method: prefill.method ?? savedContactMethod(),
      email: prefill.email ?? "",
      phone: prefill.phone ?? "",
      country: prefill.country ?? guessCountry(),
      password: "",
      remember: false,
    },
  });
  const [method, email, phone, country] = useWatch({ control, name: ["method", "email", "phone", "country"] });
  const prefilled = Boolean(prefill.email || prefill.phone);
  // The phone field loads on demand, so it takes focus itself when it appears.
  const [focusPhone, setFocusPhone] = useState(() => !prefilled && method === "phone");

  useEffect(() => {
    setFocus(prefilled ? "password" : method);
    // Only on arrival; switching methods moves focus itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { contact } = await resolveContact(values);
      return login({ ...contact, password: values.password, remember: values.remember });
    },
    onSuccess: (session, { remember, method: used }) => {
      rememberContactMethod(used);
      // The route guard takes it from here and opens the chat.
      startSession(session, remember);
      toast.success(t("auth.login.welcome", { name: session.user.name.split(" ")[0] }));
    },
    onError: (error) => {
      setFormError(getErrorMessage(error, t("auth.login.failed")));
      setFocus("password");
    },
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
    <AuthLayout>
      <AuthHeading title={t("auth.login.title")} description={t("auth.login.description")} />

      <form
        noValidate
        className="space-y-5"
        onSubmit={handleSubmit((values) => {
          setFormError(null);
          mutation.mutate(values);
        })}
      >
        <MethodSwitch value={method} onChange={switchMethod} label={t("auth.login.method")} />

        {formError && <Alert>{formError}</Alert>}

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

        <PasswordField
          label={t("auth.fields.password")}
          placeholder={t("auth.login.passwordPlaceholder")}
          autoComplete="current-password"
          error={errors.password?.message}
          labelAction={
            <TextLink
              to="/forgot-password"
              state={{ method, email, phone, country } satisfies LoginPrefill}
              className="text-[0.8125rem]"
            >
              {t("auth.login.forgot")}
            </TextLink>
          }
          {...register("password")}
        />

        <Checkbox label={t("auth.login.remember")} {...register("remember")} />

        <Button type="submit" size="lg" loading={mutation.isPending} className="group w-full">
          {mutation.isPending ? (
            t("auth.login.submitting")
          ) : (
            <>
              {t("auth.login.submit")}
              <ArrowRight
                className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                aria-hidden="true"
              />
            </>
          )}
        </Button>
      </form>

      <p className="mt-7 border-t border-line pt-6 text-center text-sm text-fg-muted">
        {t("auth.login.noAccount")} <TextLink to="/register">{t("auth.login.createAccount")}</TextLink>
      </p>
    </AuthLayout>
  );
}
