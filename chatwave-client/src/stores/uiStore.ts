import { create } from 'zustand';

interface UIState {
  isSidebarOpen: boolean;
  activeConversationId: number | null;
  toggleSidebar: () => void;
  setActiveConversation: (id: number | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: true,
  activeConversationId: null,

  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  setActiveConversation: (id) =>
    set({ activeConversationId: id }),
}));