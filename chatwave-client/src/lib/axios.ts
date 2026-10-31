import axios, { isAxiosError } from "axios";
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
  return config;
});

// An authenticated request that comes back 401 means the token expired or was revoked
// (e.g. by a password reset). Clearing the session lets the route guards send the user
// to sign in, without a full page reload. Failed sign-ins don't carry a token, so they
// are left for the form to handle.
api.interceptors.response.use(undefined, (error) => {
  if (isAxiosError(error) && error.response?.status === 401 && error.config?.headers?.Authorization) {
    useAuthStore.getState().clearSession();
  }
  return Promise.reject(error);
});

export default api;
