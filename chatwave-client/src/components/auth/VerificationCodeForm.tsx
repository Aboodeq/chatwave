import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { useCountdown } from "../../hooks/useCountdown";
import { cn, formatCountdown } from "../../lib/utils";
import { Button } from "../ui/Button";
import { OtpInput } from "../ui/OtpInput";
import { textLinkStyles } from "../ui/TextLink";

interface VerificationCodeFormProps {
  onSubmit: (code: string) => void;
  submitting: boolean;
  submitLabel: string;
  submittingLabel: string;
  /** A message from the server about the last code, e.g. "invalid or expired". */
  error: string | null;
  /** Bump to clear the boxes and replay the shake (after a rejected code). */
  attempt: number;
  /** When the next code may be requested (ms timestamp). */
  resendAt: number;
  onResend: () => void;
  resending: boolean;
  resendHint: string;
  /** Local development: the code, because text messages aren't really sent. */
  devCode?: string;
}

/** Six boxes for a one-time code, with a resend countdown. */
export function VerificationCodeForm({
  onSubmit,
  submitting,
  submitLabel,
  submittingLabel,
  error: serverError,
  attempt,
  resendAt,
  onResend,
  resending,
  resendHint,
  devCode,
}: VerificationCodeFormProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [shake, setShake] = useState(0);
  const [seenAttempt, setSeenAttempt] = useState(attempt);
  const secondsLeft = useCountdown(resendAt);

  // A rejected code starts a new attempt: clear the boxes and show the server's message.
  if (seenAttempt !== attempt) {
    setSeenAttempt(attempt);
    setCode("");
    setLocalError(null);
    setDismissed(false);
  }

  // Typing again hides the last error.
  const error = localError ?? (dismissed ? null : serverError);

  const submit = (value: string) => {
    if (submitting) return;
    if (value.length < 6) {
      setLocalError(t("auth.code.allDigits"));
      setCode("");
      setShake((n) => n + 1);
      return;
    }
    setLocalError(null);
    onSubmit(value);
  };

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit(code);
      }}
    >
      <div className="space-y-2">
        <OtpInput
          key={`${attempt}-${shake}`}
          value={code}
          onChange={(value) => {
            setCode(value);
            setLocalError(null);
            setDismissed(true);
          }}
          onComplete={submit}
          invalid={Boolean(error)}
          disabled={submitting}
          autoFocus
          describedBy={error ? "code-error" : undefined}
        />
        {error && (
          <p id="code-error" role="alert" className="text-[0.8125rem] font-medium text-danger">
            {error}
          </p>
        )}
      </div>

      {devCode && (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-line-strong bg-surface-2/60 px-3.5 py-3 text-[0.8125rem] text-fg-muted">
          <FlaskConical className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <Trans
              i18nKey="auth.code.dev"
              values={{ code: devCode }}
              components={{ code: <span dir="ltr" className="font-semibold text-fg tabular-nums" /> }}
            />
          </span>
          <button
            type="button"
            onClick={() => {
              setCode(devCode);
              submit(devCode);
            }}
            className={cn(textLinkStyles, "shrink-0")}
          >
            {t("auth.code.useIt")}
          </button>
        </div>
      )}

      <Button type="submit" size="lg" loading={submitting} className="w-full">
        {submitting ? submittingLabel : submitLabel}
      </Button>

      <p className="text-sm text-fg-muted" aria-live="polite">
        {resendHint}{" "}
        {secondsLeft > 0 ? (
          <span className="font-medium text-fg-subtle tabular-nums">
            {t("auth.code.resendIn", { time: formatCountdown(secondsLeft) })}
          </span>
        ) : (
          <button type="button" onClick={onResend} disabled={resending} className={cn(textLinkStyles, "disabled:opacity-60")}>
            {resending ? t("auth.code.sending") : t("auth.code.sendNew")}
          </button>
        )}
      </p>
    </form>
  );
}
