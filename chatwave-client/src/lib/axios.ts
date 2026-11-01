import axios, { isAxiosError } from "axios";
import toast from "react-hot-toast";
import i18n from "../i18n";
import { useAuthStore } from "../stores/authStore";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api",
  headers: { Accept: "application/json" },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // The API answers (errors, emails, texts) in the app's language.
  config.headers["Accept-Language"] = i18n.resolvedLanguage ?? "en";
  // Checks made from a background tab still deliver messages, but don't make you "online".
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    config.headers["X-Background"] = "1";
  }
  return config;
});

// An authenticated request that comes back 401 means the token expired or was revoked
// (e.g. by a password reset). Clearing the session lets the route guards send the user
// to sign in, without a full page reload. Failed sign-ins don't carry a token, and
// requests made with an older token (e.g. the sign-out call itself) are ignored.
// A 403 with "account_suspended" means an admin suspended the account.
api.interceptors.response.use(undefined, (error) => {
  const { token, clearSession } = useAuthStore.getState();
  const sentWithCurrentToken = Boolean(token) && error?.config?.headers?.Authorization === `Bearer ${token}`;

  if (isAxiosError<{ code?: string }>(error) && sentWithCurrentToken) {
    if (error.response?.status === 401) {
      clearSession("expired");
      toast(i18n.t("errors.sessionEnded"), { id: "session-ended" });
    } else if (error.response?.status === 403 && error.response.data?.code === "account_suspended") {
      clearSession("suspended");
    }
  }
  return Promise.reject(error);
});

export default api;
