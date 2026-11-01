import { useEffect, useMemo, useRef } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import { deleteMessage, editMessage, getMessages, markAsRead, sendMessage, type MessagePage } from "../api/messages";
import i18n from "../i18n";
import { getErrorMessage } from "../lib/errors";
import { sameReceipts, statusOf } from "../lib/receipts";
import { uid } from "../lib/utils";
import { useAuthStore } from "../stores/authStore";
import { useOutboxStore, type PendingMessage } from "../stores/outboxStore";
import type { Message, ReplyTo } from "../types/message";
import { bumpConversation, conversationKeys, patchConversation } from "./useConversations";
import { useDocumentVisible } from "./useDocumentVisible";

type History = InfiniteData<MessagePage, string | null>;

export const messageKeys = {
  history: (conversationId: number) => ["messages", conversationId] as const,
  poll: (conversationId: number) => ["messages", conversationId, "poll"] as const,
};

/** Until real-time updates exist, check the open conversation for new messages this often. */
const POLL_MS = 4_000;

/**
 * Message history, oldest first. Older pages load on demand; new messages arrive by
 * polling just the newest page and merging it in (refetching every loaded page each
 * time would multiply requests the further back someone scrolls).
 */
export function useMessageHistory(conversationId: number) {
  const queryClient = useQueryClient();

  const history = useInfiniteQuery({
    queryKey: messageKeys.history(conversationId),
    queryFn: ({ pageParam, signal }) => getMessages(conversationId, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.next_cursor,
    staleTime: Infinity,
  });

  useQuery({
    queryKey: messageKeys.poll(conversationId),
    queryFn: async ({ signal }) => {
      const latest = await getMessages(conversationId, null, signal);
      const key = messageKeys.history(conversationId);
      const cached = queryClient.getQueryData<History>(key);
      if (cached) {
        const merged = mergeNewestPage(cached, latest);
        if (merged) {
          queryClient.setQueryData(key, merged);
        } else {
          await queryClient.invalidateQueries({ queryKey: key, exact: true });
        }
      }
      syncPreviewStatus(queryClient, conversationId, latest);
      return latest.messages[0]?.id ?? 0;
    },
    enabled: history.isSuccess,
    refetchInterval: POLL_MS,
  });

  const messages = useMemo(() => {
    const seen = new Set<number>();
    const list: Message[] = [];
    for (const page of history.data?.pages ?? []) {
      for (const message of page.messages) {
        if (!seen.has(message.id)) {
          seen.add(message.id);
          list.push(message);
        }
      }
    }
    return list.reverse();
  }, [history.data]);

  // The newest page carries the newest receipts (it's the one that's polled).
  const receipts = history.data?.pages[0]?.receipts;

  return { ...history, messages, receipts };
}

/** Keeps the ticks on the chat list's preview in step with the open conversation. */
function syncPreviewStatus(queryClient: QueryClient, conversationId: number, latest: MessagePage) {
  const meId = useAuthStore.getState().user?.id;
  patchConversation(queryClient, conversationId, (conversation) => {
    const last = conversation.last_message;
    if (!last || last.sender.id !== meId) return conversation;
    const status = statusOf(last, latest.receipts, meId);
    return status === (last.status ?? null) ? conversation : { ...conversation, last_message: { ...last, status } };
  });
}

/**
 * Put the newest page (newest first) in front of the cached history. Returns null when
 * the newest page doesn't reach the messages we already have, i.e. there may be a gap.
 */
function mergeNewestPage(cached: History, newest: MessagePage): History | null {
  const [first, ...rest] = cached.pages;
  if (!first) return null;

  if (newest.messages.length === 0) {
    return { pages: [{ messages: [], next_cursor: null, receipts: newest.receipts }], pageParams: [null] };
  }

  const oldestInWindow = newest.messages[newest.messages.length - 1].id;
  const newestCached = first.messages[0]?.id ?? 0;
  if (newest.next_cursor && first.messages.length > 0 && oldestInWindow > newestCached) {
    return null;
  }

  // The window replaces what it covers (picking up edits and deletions there); anything
  // older stays, so the first page's cursor still points at the right place.
  const merged = [...newest.messages, ...first.messages.filter((m) => m.id < oldestInWindow)];
  const unchanged =
    sameReceipts(first.receipts, newest.receipts) &&
    merged.length === first.messages.length &&
    merged.every((m, i) => {
      const old = first.messages[i];
      return m.id === old.id && m.body === old.body && m.edited_at === old.edited_at;
    });

  return unchanged
    ? cached
    : { ...cached, pages: [{ ...first, messages: merged, receipts: newest.receipts }, ...rest] };
}

function updateHistory(
  queryClient: QueryClient,
  conversationId: number,
  update: (messages: Message[], pageIndex: number) => Message[],
) {
  queryClient.setQueryData<History>(messageKeys.history(conversationId), (data) =>
    data ? { ...data, pages: data.pages.map((page, i) => ({ ...page, messages: update(page.messages, i) })) } : data,
  );
}

export function toReplyTo(message: Message): ReplyTo {
  return { id: message.id, body: message.body, sender: message.sender };
}

/** Sending shows the message immediately; failures stay visible with Retry. */
export function useSendMessage(conversationId: number) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (pending: PendingMessage) =>
      sendMessage(conversationId, { body: pending.body, reply_to_id: pending.replyTo?.id ?? null }),
    onSuccess: (message, pending) => {
      updateHistory(queryClient, conversationId, (messages, page) =>
        page === 0 && !messages.some((m) => m.id === message.id) ? [message, ...messages] : messages,
      );
      useOutboxStore.getState().remove(pending.clientId);
      bumpConversation(queryClient, message);
    },
    onError: (error, pending) => {
      useOutboxStore.getState().setStatus(pending.clientId, "failed");
      toast.error(getErrorMessage(error, i18n.t("chat.errors.notSent")));
    },
  });

  return {
    send: (body: string, replyTo: ReplyTo | null) => {
      const pending: PendingMessage = {
        clientId: uid(),
        conversationId,
        body,
        replyTo,
        createdAt: new Date().toISOString(),
        status: "sending",
      };
      useOutboxStore.getState().add(pending);
      mutation.mutate(pending);
    },
    retry: (pending: PendingMessage) => {
      useOutboxStore.getState().setStatus(pending.clientId, "sending");
      mutation.mutate({ ...pending, status: "sending" });
    },
    discard: (pending: PendingMessage) => useOutboxStore.getState().remove(pending.clientId),
  };
}

export function useEditMessage(conversationId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: string }) => editMessage(id, body),
    onSuccess: (message) => {
      updateHistory(queryClient, conversationId, (messages) =>
        messages.map((m) => (m.id === message.id ? message : m)),
      );
      patchConversation(queryClient, conversationId, (c) =>
        c.last_message?.id === message.id ? { ...c, last_message: message } : c,
      );
    },
    onError: (error) => toast.error(getErrorMessage(error, i18n.t("chat.errors.notSaved"))),
  });
}

export function useDeleteMessage(conversationId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteMessage(id),
    onSuccess: (_, id) => {
      updateHistory(queryClient, conversationId, (messages) => messages.filter((m) => m.id !== id));
      void queryClient.invalidateQueries({ queryKey: conversationKeys.all });
    },
    onError: (error) => toast.error(getErrorMessage(error, i18n.t("chat.errors.notDeleted"))),
  });
}

/**
 * Marks the conversation read while it's on screen and new messages come in, up to the
 * newest message shown (so a message that arrives meanwhile isn't marked seen unseen).
 */
export function useMarkAsRead(conversationId: number, latestIncomingId: number | undefined, unreadCount: number) {
  const queryClient = useQueryClient();
  const visible = useDocumentVisible();
  const lastMarked = useRef(0);

  useEffect(() => {
    if (!visible || !latestIncomingId) return;
    if (latestIncomingId <= lastMarked.current && unreadCount === 0) return;

    lastMarked.current = latestIncomingId;
    markAsRead(conversationId, latestIncomingId)
      .then(() => patchConversation(queryClient, conversationId, (c) => ({ ...c, unread_count: 0 })))
      .catch(() => {
        lastMarked.current = 0; // try again next time
      });
  }, [conversationId, latestIncomingId, unreadCount, visible, queryClient]);
}
