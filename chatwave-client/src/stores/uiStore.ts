import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemePreference = "light" | "dark" | "system";

interface UIState {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  /** Desktop: hide the conversation list while a chat is open. */
  chatListHidden: boolean;
  setChatListHidden: (hidden: boolean) => void;
}

// The "chatwave-ui" key is also read by the inline script in index.html.
export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: "light",
      setTheme: (theme) => set({ theme }),
      chatListHidden: false,
      setChatListHidden: (chatListHidden) => set({ chatListHidden }),
    }),
    { name: "chatwave-ui" },
  ),
);
