import { isAxiosError } from "axios";
import i18n from "../i18n";

interface ApiErrorBody {
  message?: string;
  errors?: Record<string, string[]>;
  retry_after?: number;
}

function body(error: unknown): ApiErrorBody | undefined {
  return isAxiosError<ApiErrorBody>(error) ? error.response?.data : undefined;
}

export function getStatus(error: unknown): number | undefined {
  return isAxiosError(error) ? error.response?.status : undefined;
}

/** Field errors from a Laravel validation response (first message per field). */
export function getFieldErrors(error: unknown): Record<string, string> {
  const errors = body(error)?.errors ?? {};
  return Object.fromEntries(
    Object.entries(errors)
      .filter(([, messages]) => messages.length > 0)
      .map(([field, messages]) => [field, messages[0]]),
  );
}

/** Seconds to wait after a 429, from the body or the Retry-After header. */
export function getRetryAfter(error: unknown): number | undefined {
  if (!isAxiosError(error) || error.response?.status !== 429) return undefined;
  const fromBody = body(error)?.retry_after;
  const fromHeader = Number(error.response.headers?.["retry-after"]);
  const seconds = fromBody ?? (Number.isFinite(fromHeader) ? fromHeader : undefined);
  return seconds && seconds > 0 ? seconds : undefined;
}

/** A sentence that is safe to show the user. */
export function getErrorMessage(error: unknown, fallback: string = i18n.t("errors.generic")): string {
  if (isAxiosError(error) && !error.response) {
    return i18n.t("errors.offline");
  }
  const data = body(error);
  const firstFieldError = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined;
  return firstFieldError ?? data?.message ?? fallback;
}
