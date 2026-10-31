import { useQuery, type QueryClient } from "@tanstack/react-query";
import { getConversation, getConversations } from "../api/conversations";
import { getStatus } from "../lib/errors";
import type { Conversation } from "../types/conversation";
import type { Message } from "../types/message";

export const conversationKeys = {
  all: ["conversations"] as const,
  detail: (id: number) => ["conversations", "detail", id] as const,
};

/** Until real-time updates exist, poll for new messages and unread counts. */
const LIST_POLL_MS = 10_000;

export function useConversations() {
  return useQuery({
    queryKey: conversationKeys.all,
    queryFn: getConversations,
    refetchInterval: LIST_POLL_MS,
    refetchOnWindowFocus: true,
  });
}

/** One conversation, from the list when possible (e.g. not for a fresh deep link). */
export function useConversation(id: number) {
  const list = useConversations();
  const fromList = list.data?.find((c) => c.id === id);

  const detail = useQuery({
    queryKey: conversationKeys.detail(id),
    queryFn: () => getConversation(id),
    enabled: !list.isPending && !fromList,
  });

  return {
    conversation: fromList ?? detail.data,
    isLoading: list.isPending || (!fromList && detail.isPending),
    notFound: getStatus(detail.error) === 404,
  };
}

export function patchConversation(
  queryClient: QueryClient,
  id: number,
  patch: (conversation: Conversation) => Conversation,
) {
  queryClient.setQueryData<Conversation[]>(conversationKeys.all, (list) =>
    list?.map((c) => (c.id === id ? patch(c) : c)),
  );
}

/** Show a just-sent message as the conversation's preview and move it to the top. */
export function bumpConversation(queryClient: QueryClient, message: Message) {
  queryClient.setQueryData<Conversation[]>(conversationKeys.all, (list) => {
    if (!list) return list;
    const index = list.findIndex((c) => c.id === message.conversation_id);
    if (index === -1) return list;
    const updated = { ...list[index], last_message: message, updated_at: message.created_at };
    return [updated, ...list.slice(0, index), ...list.slice(index + 1)];
  });
}

/** Add a conversation to the list (new ones go to the top). */
export function upsertConversation(queryClient: QueryClient, conversation: Conversation) {
  queryClient.setQueryData<Conversation[]>(conversationKeys.all, (list) => {
    if (!list) return [conversation];
    return list.some((c) => c.id === conversation.id)
      ? list.map((c) => (c.id === conversation.id ? { ...c, ...conversation } : c))
      : [conversation, ...list];
  });
}
