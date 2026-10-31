import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemePreference = "light" | "dark" | "system";

interface UIState {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

// The "chatwave-ui" key is also read by the inline script in index.html.
export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => set({ theme }),
    }),
    { name: "chatwave-ui" },
  ),
);
