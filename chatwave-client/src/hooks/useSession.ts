import { useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMe, logout } from "../api/auth";
import { useAuthStore } from "../stores/authStore";

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
}

/** Revokes the token on the server, then forgets it locally. */
export function useSignOut() {
  const clearSession = useAuthStore((s) => s.clearSession);

  return useCallback(async () => {
    try {
      await logout();
    } catch {
      // Already invalid or offline: signing out locally is still the right outcome.
    }
    clearSession();
  }, [clearSession]);
}
