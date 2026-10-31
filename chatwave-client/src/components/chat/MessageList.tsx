import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { ArrowDown, Loader2 } from "lucide-react";
import { cn, formatDayLabel } from "../../lib/utils";
import type { PendingMessage } from "../../stores/outboxStore";
import type { Conversation } from "../../types/conversation";
import type { Message } from "../../types/message";
import { Avatar } from "../ui/Avatar";
import { Skeleton } from "../ui/Skeleton";
import { MessageBubble, PendingBubble } from "./MessageBubble";

/** Messages from the same person this close together are drawn as one run. */
const RUN_GAP_MINUTES = 5;

interface MessageListProps {
  conversation: Conversation | undefined;
  messages: Message[];
  pending: PendingMessage[];
  meId?: number;
  isLoading: boolean;
  hasOlder: boolean;
  isLoadingOlder: boolean;
  loadOlder: () => void;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (message: Message) => void;
  onRetry: (pending: PendingMessage) => void;
  onDiscard: (pending: PendingMessage) => void;
}

interface Row {
  message: Message;
  first: boolean;
  last: boolean;
}

function groupByDay(messages: Message[]) {
  const days: { key: string; label: string; rows: Row[] }[] = [];
  const sameRun = (a?: Message, b?: Message) =>
    !!a &&
    !!b &&
    a.sender.id === b.sender.id &&
    dayjs(a.created_at).isSame(b.created_at, "day") &&
    Math.abs(dayjs(b.created_at).diff(a.created_at, "minute")) < RUN_GAP_MINUTES;

  messages.forEach((message, i) => {
    const key = dayjs(message.created_at).format("YYYY-MM-DD");
    if (days.at(-1)?.key !== key) {
      days.push({ key, label: formatDayLabel(message.created_at), rows: [] });
    }
    days.at(-1)!.rows.push({
      message,
      first: !sameRun(messages[i - 1], message),
      last: !sameRun(message, messages[i + 1]),
    });
  });
  return days;
}

export function MessageList({
  conversation,
  messages,
  pending,
  meId,
  isLoading,
  hasOlder,
  isLoadingOlder,
  loadOlder,
  onReply,
  onEdit,
  onDelete,
  onRetry,
  onDiscard,
}: MessageListProps) {
  // The scroller is flex-col-reverse, so the browser keeps it pinned to the newest message
  // and loading older history above doesn't move what's on screen. scrollTop is 0 at the
  // bottom and negative when scrolled up.
  const scrollRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [leftBottomAtId, setLeftBottomAtId] = useState(0);

  const days = useMemo(() => groupByDay(messages), [messages]);
  const newestId = messages.at(-1)?.id ?? 0;
  const hasUnseen = !atBottom && newestId > leftBottomAtId;

  // Load older messages when the top of the history scrolls into view.
  useEffect(() => {
    const root = scrollRef.current;
    const target = topRef.current;
    if (!root || !target || !hasOlder || isLoadingOlder) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadOlder();
      },
      { root, rootMargin: "400px 0px 0px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasOlder, isLoadingOlder, loadOlder, messages.length]);

  // Sending your own message always brings you back to the bottom.
  const pendingCount = pending.length;
  useLayoutEffect(() => {
    if (pendingCount > 0) scrollRef.current?.scrollTo({ top: 0 });
  }, [pendingCount]);

  const scrollToMessage = (id: number) => {
    const element = document.getElementById(`message-${id}`);
    if (!element) {
      toast("That message is further back. Scroll up to load it.");
      return;
    }
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    element.classList.remove("animate-flash");
    void element.offsetWidth; // restart the highlight animation
    element.classList.add("animate-flash");
  };

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const bottom = Math.abs(el.scrollTop) < 80;
    if (bottom !== atBottom) {
      setAtBottom(bottom);
      if (!bottom) setLeftBottomAtId(newestId);
    }
  };

  const showSender = conversation?.type === "group";

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="scrollbar-thin flex min-h-0 flex-1 flex-col-reverse overflow-y-auto overscroll-contain"
      >
        <div role="log" aria-label="Messages" className="w-full px-3 pt-4 pb-3 md:px-6 lg:px-8">
          <div ref={topRef} />

          {isLoading ? (
            <MessagesSkeleton />
          ) : (
            <>
              {isLoadingOlder && (
                <div className="flex justify-center py-3" role="status">
                  <Loader2 className="size-5 animate-spin text-fg-subtle" aria-label="Loading older messages" />
                </div>
              )}

              {!hasOlder && conversation && <ConversationStart conversation={conversation} />}

              {days.map((day) => (
                <section key={day.key} aria-label={day.label}>
                  <div className="sticky top-2 z-10 my-4 flex justify-center">
                    <span className="rounded-full bg-surface/90 px-3 py-1 text-xs font-medium text-fg-muted shadow-soft ring-1 ring-line backdrop-blur">
                      {day.label}
                    </span>
                  </div>
                  {day.rows.map(({ message, first, last }) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      meId={meId}
                      mine={message.sender.id === meId}
                      first={first}
                      last={last}
                      showSender={showSender}
                      onReply={onReply}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onQuoteClick={scrollToMessage}
                    />
                  ))}
                </section>
              ))}

              {pending.map((item, index) => (
                <PendingBubble
                  key={item.clientId}
                  pending={item}
                  meId={meId}
                  first={index === 0 && messages.at(-1)?.sender.id !== meId}
                  onRetry={onRetry}
                  onDiscard={onDiscard}
                  onQuoteClick={scrollToMessage}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {!atBottom && (
        <button
          type="button"
          onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
          className={cn(
            "absolute end-5 bottom-4 inline-flex h-10 animate-pop items-center gap-2 rounded-full border border-line bg-surface px-3 text-sm font-medium text-fg shadow-pop outline-none hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring",
            !hasUnseen && "w-10 justify-center px-0",
          )}
          aria-label={hasUnseen ? "New messages, jump to latest" : "Jump to latest"}
        >
          <ArrowDown className="size-4" aria-hidden="true" />
          {hasUnseen && <span>New messages</span>}
        </button>
      )}
    </div>
  );
}

function ConversationStart({ conversation }: { conversation: Conversation }) {
  const name = conversation.name ?? "this conversation";
  const firstName = name.split(" ")[0];

  return (
    <div className="flex flex-col items-center px-4 pt-8 pb-2 text-center">
      <Avatar name={name} src={conversation.avatar} size="xl" />
      <h3 dir="auto" className="mt-3 font-display text-lg font-semibold">
        {name}
      </h3>
      <p className="mt-1 max-w-xs text-sm text-fg-muted">
        {conversation.type === "group"
          ? "This is the beginning of the group."
          : `This is the beginning of your conversation with ${firstName}.`}
      </p>
    </div>
  );
}

function MessagesSkeleton() {
  const rows = [
    { mine: false, width: "w-2/5" },
    { mine: false, width: "w-1/3" },
    { mine: true, width: "w-1/2" },
    { mine: false, width: "w-3/5" },
    { mine: true, width: "w-1/4" },
    { mine: true, width: "w-2/5" },
  ];
  return (
    <div aria-label="Loading messages" className="space-y-2 pt-6">
      {rows.map((row, i) => (
        <div key={i} className={cn("flex", row.mine ? "justify-end" : "justify-start")}>
          <Skeleton className={cn("h-10 rounded-2xl", row.width)} />
        </div>
      ))}
    </div>
  );
}
