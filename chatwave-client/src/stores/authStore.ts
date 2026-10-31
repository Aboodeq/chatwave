import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import type { User } from "../types/user";

interface AuthState {
  token: string | null;
  user: User | null;
  /** "Keep me signed in": stored in localStorage (survives restarts) instead of sessionStorage. */
  remember: boolean;
  startSession: (session: { token: string; user: User }, remember: boolean) => void;
  setUser: (user: User) => void;
  clearSession: () => void;
}

/**
 * Persists to localStorage when the user asked to be remembered, otherwise to
 * sessionStorage so the session ends with the browser tab.
 */
const sessionAwareStorage: StateStorage = {
  getItem: (name) => localStorage.getItem(name) ?? sessionStorage.getItem(name),
  setItem: (name, value) => {
    let remember = false;
    try {
      remember = Boolean(JSON.parse(value)?.state?.remember);
    } catch {
      // keep the safer default
    }
    const [target, other] = remember ? [localStorage, sessionStorage] : [sessionStorage, localStorage];
    target.setItem(name, value);
    other.removeItem(name);
  },
  removeItem: (name) => {
    localStorage.removeItem(name);
    sessionStorage.removeItem(name);
  },
};

// The previous client kept a second copy of the token under these keys.
localStorage.removeItem("auth_token");
localStorage.removeItem("auth-storage");

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      remember: false,
      startSession: ({ token, user }, remember) => set({ token, user, remember }),
      setUser: (user) => set({ user }),
      clearSession: () => set({ token: null, user: null, remember: false }),
    }),
    {
      name: "chatwave-auth",
      storage: createJSONStorage(() => sessionAwareStorage),
      partialize: ({ token, user, remember }) => ({ token, user, remember }),
    },
  ),
);

export const selectIsAuthenticated = (state: AuthState) => state.token !== null;
