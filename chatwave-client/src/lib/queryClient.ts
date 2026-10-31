import { QueryClient } from "@tanstack/react-query";
import { getStatus } from "./errors";
import { useAuthStore } from "../stores/authStore";
import { useOutboxStore } from "../stores/outboxStore";
import { clearDrafts } from "./drafts";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const status = getStatus(error);
        // Retrying won't fix these.
        if (status && [401, 403, 404, 422, 429].includes(status)) return false;
        return failureCount < 2;
      },
    },
  },
});

// When a session ends, forget everything held for that account, so the next person to
// sign in on this tab never sees its conversations, drafts or unsent messages.
useAuthStore.subscribe((state, previous) => {
  if (previous.token && !state.token) {
    queryClient.clear();
    clearDrafts();
    useOutboxStore.setState({ pending: [] });
  }
});
