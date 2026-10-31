import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { ArrowLeft } from "lucide-react";
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
import { formatLastSeen, isTouchDevice } from "../../lib/utils";
import { useAuthStore } from "../../stores/authStore";
import { useOutboxStore } from "../../stores/outboxStore";
import type { Conversation } from "../../types/conversation";
import type { Message } from "../../types/message";
import { Avatar } from "../ui/Avatar";
import { buttonStyles } from "../ui/buttonStyles";
import { Skeleton } from "../ui/Skeleton";
import { Composer } from "./Composer";
import { DeleteMessageDialog } from "./DeleteMessageDialog";
import { MessageList } from "./MessageList";

export function ConversationView({ conversationId }: { conversationId: number }) {
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

  return (
    <>
      <ThreadHeader conversation={conversation} />

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
    </>
  );
}

function ThreadHeader({ conversation }: { conversation: Conversation | undefined }) {
  let subtitle = "";
  if (conversation?.type === "group") {
    subtitle = conversation.group?.description ?? "Group";
  } else if (conversation?.is_online) {
    subtitle = "Online";
  } else if (conversation?.last_seen_at) {
    subtitle = formatLastSeen(conversation.last_seen_at);
  } else if (conversation?.participant) {
    subtitle = conversation.participant.status_text;
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-line bg-surface px-2 md:gap-3 md:px-5">
      <Link
        to="/chat"
        aria-label="Back to chats"
        className="grid size-10 shrink-0 place-items-center rounded-full text-fg-muted outline-none hover:bg-surface-2 hover:text-fg focus-visible:ring-2 focus-visible:ring-ring md:hidden"
      >
        <ArrowLeft className="size-5 rtl:rotate-180" aria-hidden="true" />
      </Link>

      {conversation ? (
        <>
          <Avatar name={conversation.name} src={conversation.avatar} online={conversation.is_online} />
          <div className="min-w-0 flex-1">
            <h1 dir="auto" className="truncate text-[0.9375rem] font-semibold">
              {conversation.name ?? "Conversation"}
            </h1>
            {subtitle && (
              <p dir="auto" className="truncate text-xs text-fg-subtle">
                {subtitle}
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-1 items-center gap-3" aria-label="Loading conversation">
          <Skeleton className="size-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      )}
    </header>
  );
}
