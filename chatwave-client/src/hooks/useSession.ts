import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMe, logout } from "../api/auth";
import { useAuthStore } from "../stores/authStore";
import type { User } from "../types/user";
import { useAccountLanguage } from "./useLanguage";

/**
 * Refreshes the signed-in user's profile. An expired or revoked token comes back as a 401,
 * which signs the user out (see lib/axios.ts).
 */
export function useSession() {
  const setUser = useAuthStore((s) => s.setUser);
  const { data } = useQuery({ queryKey: ["me"], queryFn: getMe, staleTime: 5 * 60_000 });

  useEffect(() => {
    if (data) setUser(data);
  }, [data, setUser]);

  useAccountLanguage();
}

/** Puts an updated profile everywhere the signed-in user is shown. */
export function useUpdateCurrentUser() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useCallback(
    (user: User) => {
      setUser(user);
      queryClient.setQueryData(["me"], user);
    },
    [queryClient, setUser],
  );
}

/** Forgets the session right away and revokes its token on the server. */
export function useSignOut() {
  const clearSession = useAuthStore((s) => s.clearSession);

  return useCallback(async () => {
    const token = useAuthStore.getState().token;
    clearSession("signed-out");
    if (!token) return;
    try {
      await logout(token);
    } catch {
      // Already invalid or offline: the local sign-out has happened either way.
    }
  }, [clearSession]);
}
