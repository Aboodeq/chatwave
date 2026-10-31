import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { ArrowLeft, Ban, Info, PanelLeftOpen, X } from "lucide-react";
import { useBlockActions } from "../../hooks/useBlocks";
import { useConversation } from "../../hooks/useConversations";
import {
  toReplyTo,
  useDeleteMessage,
  useEditMessage,
  useMarkAsRead,
  useMessageHistory,
  useSendMessage,
} from "../../hooks/useMessages";
import { getDraft, setDraft } from "../../lib/drafts";
import { cn, formatLastSeen, isTouchDevice } from "../../lib/utils";
import { useNow } from "../../hooks/useNow";
import { useAuthStore } from "../../stores/authStore";
import { useOutboxStore } from "../../stores/outboxStore";
import { useUIStore } from "../../stores/uiStore";
import type { Conversation } from "../../types/conversation";
import type { Message } from "../../types/message";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { buttonStyles } from "../ui/buttonStyles";
import { IconButton } from "../ui/IconButton";
import { Skeleton } from "../ui/Skeleton";
import { Composer } from "./Composer";
import { ContactInfoPanel } from "./ContactInfoPanel";
import { DeleteMessageDialog } from "./DeleteMessageDialog";
import { MessageList } from "./MessageList";

export function ConversationView({ conversationId, infoOpen }: { conversationId: number; infoOpen: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const meId = useAuthStore((s) => s.user?.id);
  const { conversation, notFound } = useConversation(conversationId);
  const history = useMessageHistory(conversationId);
  const pending = useOutboxStore(useShallow((s) => s.pending.filter((p) => p.conversationId === conversationId)));
  const { send, retry, discard } = useSendMessage(conversationId);
  const edit = useEditMessage(conversationId);
  const remove = useDeleteMessage(conversationId);

  const [text, setText] = useState(() => getDraft(conversationId));
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<{ message: Message; draft: string } | null>(null);
  const [deleting, setDeleting] = useState<Message | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const latestIncomingId = useMemo(
    () => history.messages.findLast((m) => m.sender.id !== meId)?.id,
    [history.messages, meId],
  );
  useMarkAsRead(conversationId, latestIncomingId, conversation?.unread_count ?? 0);

  // Ready to type as soon as a conversation opens (not on phones: it would pop the keyboard).
  useEffect(() => {
    if (!isTouchDevice()) textareaRef.current?.focus();
  }, []);

  const openedFromChat = (location.state as { fromChat?: boolean } | null)?.fromChat === true;
  const openInfo = () => navigate(`/chat/${conversationId}/info`, { state: { fromChat: true } });
  // Closing goes back when the panel was opened from this chat, so the phone's back
  // button and the close button do the same thing and history doesn't pile up.
  const closeInfo = useCallback(() => {
    if (openedFromChat) navigate(-1);
    else navigate(`/chat/${conversationId}`, { replace: true });
  }, [conversationId, navigate, openedFromChat]);
  const closeChat = () => navigate("/chat");

  // Esc closes contact info, then the chat (like WhatsApp). Esc inside the composer,
  // a menu or a dialog is handled there first and marks the event as handled.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]')) return;
      // Check the address bar rather than `infoOpen`: after a quick first Esc,
      // this screen may not have re-rendered yet.
      if (window.location.pathname.endsWith("/info")) closeInfo();
      else navigate("/chat");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeInfo, navigate]);

  const focusComposer = () => requestAnimationFrame(() => textareaRef.current?.focus());

  const updateText = (value: string) => {
    setText(value);
    if (!editing) setDraft(conversationId, value);
  };

  const stopEditing = () => {
    if (!editing) return;
    setText(editing.draft);
    setEditing(null);
  };

  const startReply = (message: Message) => {
    stopEditing();
    setReplyTo(message);
    focusComposer();
  };

  const startEdit = (message: Message) => {
    setReplyTo(null);
    setEditing({ message, draft: editing ? editing.draft : text });
    setText(message.body ?? "");
    focusComposer();
  };

  const cancel = () => {
    if (editing) stopEditing();
    else setReplyTo(null);
    focusComposer();
  };

  const submit = () => {
    const body = text.trim();
    if (!body) return;

    if (editing) {
      const { message, draft } = editing;
      if (body === message.body) {
        stopEditing();
        return;
      }
      edit.mutate(
        { id: message.id, body },
        {
          onSuccess: () => {
            setEditing(null);
            setText(draft);
          },
        },
      );
      return;
    }

    send(body, replyTo ? toReplyTo(replyTo) : null);
    setText("");
    setReplyTo(null);
    setDraft(conversationId, "");
  };

  const editLast = () => {
    const last = history.messages.findLast((m) => m.sender.id === meId && m.type === "text");
    if (last) startEdit(last);
  };

  if (notFound) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <h1 className="font-display text-xl font-semibold">Conversation not found</h1>
        <p className="mt-2 max-w-xs text-sm text-fg-muted">It may have been removed, or you're not part of it.</p>
        <Link to="/chat" className={buttonStyles({ variant: "secondary", className: "mt-6" })}>
          Back to chats
        </Link>
      </div>
    );
  }

  const firstName = conversation?.name?.split(" ")[0];

  const showInfo = infoOpen && conversation?.type === "private";

  return (
    <div className="relative flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <ThreadHeader conversation={conversation} onOpenInfo={openInfo} onClose={closeChat} />

        <MessageList
          conversation={conversation}
          messages={history.messages}
          pending={pending}
          meId={meId}
          isLoading={history.isPending}
          hasOlder={history.hasNextPage}
          isLoadingOlder={history.isFetchingNextPage}
          loadOlder={() => void history.fetchNextPage()}
          onReply={startReply}
          onEdit={startEdit}
          onDelete={setDeleting}
          onRetry={retry}
          onDiscard={discard}
        />

        {conversation && !conversation.can_message ? (
          <BlockedNotice conversation={conversation} />
        ) : (
          <Composer
            value={text}
            onChange={updateText}
            onSubmit={submit}
            onCancel={cancel}
            onEditLast={editLast}
            replyTo={replyTo}
            editing={editing?.message ?? null}
            meId={meId}
            placeholder={firstName ? `Message ${firstName}` : "Write a message"}
            textareaRef={textareaRef}
          />
        )}
      </div>

      {showInfo && conversation && <ContactInfoPanel conversation={conversation} onClose={closeInfo} />}

      <DeleteMessageDialog
        message={deleting}
        deleting={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={(message) =>
          remove.mutate(message.id, {
            onSettled: () => setDeleting(null),
            onSuccess: () => {
              if (editing?.message.id === message.id) stopEditing();
              if (replyTo?.id === message.id) setReplyTo(null);
            },
          })
        }
      />
    </div>
  );
}

function ThreadHeader({
  conversation,
  onOpenInfo,
  onClose,
}: {
  conversation: Conversation | undefined;
  onOpenInfo: () => void;
  onClose: () => void;
}) {
  // Re-render periodically so "Last seen 2 minutes ago" keeps counting.
  const now = useNow(30_000);
  const chatListHidden = useUIStore((s) => s.chatListHidden);
  const setChatListHidden = useUIStore((s) => s.setChatListHidden);
  const isPrivate = conversation?.type === "private";
  const online = isPrivate && conversation.is_online === true;

  let subtitle = "";
  if (conversation?.type === "group") {
    subtitle = conversation.group?.description ?? "Group";
  } else if (online) {
    subtitle = "Online";
  } else if (conversation?.last_seen_at) {
    subtitle = formatLastSeen(conversation.last_seen_at, now);
  } else if (isPrivate) {
    subtitle = isTouchDevice() ? "Tap for contact info" : "Click for contact info";
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-1 border-b border-line bg-surface px-2 md:gap-2 md:px-4">
      <Link
        to="/chat"
        aria-label="Back to chats"
        className="grid size-10 shrink-0 place-items-center rounded-full text-fg-muted outline-none hover:bg-surface-2 hover:text-fg focus-visible:ring-2 focus-visible:ring-ring md:hidden"
      >
        <ArrowLeft className="size-5 rtl:rotate-180" aria-hidden="true" />
      </Link>
      {chatListHidden && (
        <IconButton
          icon={PanelLeftOpen}
          label="Show chat list"
          className="hidden md:inline-grid"
          onClick={() => setChatListHidden(false)}
        />
      )}

      {conversation ? (
        <button
          type="button"
          onClick={onOpenInfo}
          disabled={!isPrivate}
          className="flex min-w-0 items-center gap-3 rounded-xl py-1.5 ps-1.5 pe-3 text-start transition-colors outline-none hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none"
        >
          <Avatar name={conversation.name} src={conversation.avatar} online={conversation.is_online} />
          <span className="min-w-0">
            <span dir="auto" className="block truncate text-[0.9375rem] font-semibold">
              {conversation.name ?? "Conversation"}
            </span>
            {subtitle && (
              <span
                dir="auto"
                className={cn("block truncate text-xs", online ? "font-medium text-success" : "text-fg-subtle")}
              >
                {subtitle}
              </span>
            )}
            {isPrivate && <span className="sr-only">. Open contact info</span>}
          </span>
        </button>
      ) : (
        <div className="flex flex-1 items-center gap-3 px-2" aria-label="Loading conversation">
          <Skeleton className="size-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      )}

      <div className="ms-auto flex shrink-0 items-center">
        {isPrivate && <IconButton icon={Info} label="Contact info" onClick={onOpenInfo} />}
        <IconButton icon={X} label="Close chat (Esc)" className="hidden md:inline-grid" onClick={onClose} />
      </div>
    </header>
  );
}

/** Replaces the message box when either person in a private chat blocked the other. */
function BlockedNotice({ conversation }: { conversation: Conversation }) {
  const { unblock } = useBlockActions();
  const name = conversation.name ?? "this person";
  const firstName = name.split(" ")[0];
  const person = conversation.participant;

  return (
    <div className="shrink-0 border-t border-line bg-surface px-3 py-3 md:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-sm text-fg-muted">
        <Ban className="size-4 shrink-0" aria-hidden="true" />
        {conversation.is_blocked ? (
          <>
            <span className="min-w-0 flex-1">You blocked {firstName}. Unblock them to send a message.</span>
            {person && (
              <Button
                variant="secondary"
                size="sm"
                loading={unblock.isPending}
                onClick={() => unblock.mutate({ id: person.id, name: firstName })}
              >
                Unblock
              </Button>
            )}
          </>
        ) : (
          <span>You can't send messages to {firstName}.</span>
        )}
      </div>
    </div>
  );
}
