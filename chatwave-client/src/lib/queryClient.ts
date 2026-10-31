import { QueryClient } from "@tanstack/react-query";
import { getStatus } from "./errors";
import { useAuthStore } from "../stores/authStore";

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

// Never show one account's cached conversations to the next person who signs in.
useAuthStore.subscribe((state, previous) => {
  if (previous.token && !state.token) {
    queryClient.clear();
  }
});
