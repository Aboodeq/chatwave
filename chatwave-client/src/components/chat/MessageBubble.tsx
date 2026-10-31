import { useState, type ReactNode } from "react";
import { DropdownMenu } from "radix-ui";
import toast from "react-hot-toast";
import { CircleAlert, Clock3, Copy, MoreHorizontal, Pencil, Reply, RotateCcw, Trash2 } from "lucide-react";
import { cn, formatTime } from "../../lib/utils";
import type { PendingMessage } from "../../stores/outboxStore";
import type { Message, ReplyTo } from "../../types/message";
import { IconButton } from "../ui/IconButton";
import { menuContent, menuItem, menuItemDanger, menuSeparator } from "../ui/menuStyles";
import { MessageText } from "./MessageText";

interface Position {
  mine: boolean;
  /** First/last of a run of messages from the same person, for spacing and bubble shape. */
  first: boolean;
  last: boolean;
}

interface MessageBubbleProps extends Position {
  message: Message;
  meId?: number;
  showSender: boolean;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (message: Message) => void;
  onQuoteClick: (messageId: number) => void;
}

export function MessageBubble({
  message,
  meId,
  mine,
  first,
  last,
  showSender,
  onReply,
  onEdit,
  onDelete,
  onQuoteClick,
}: MessageBubbleProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const canEdit = mine && message.type === "text";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.body ?? "");
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Couldn't copy the message.");
    }
  };

  const actions = (
    <div
      className={cn(
        "flex shrink-0 items-center self-center opacity-0 transition-opacity duration-150",
        "group-hover:opacity-100 group-focus-within:opacity-100",
        menuOpen && "opacity-100",
        mine && "flex-row-reverse",
      )}
    >
      <IconButton icon={Reply} label="Reply" size="sm" onClick={() => onReply(message)} />
      <DropdownMenu.Root onOpenChange={setMenuOpen}>
        <DropdownMenu.Trigger asChild>
          <IconButton icon={MoreHorizontal} label="More actions" size="sm" />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content side="top" align={mine ? "end" : "start"} sideOffset={4} className={menuContent}>
            <DropdownMenu.Item className={menuItem} onSelect={() => onReply(message)}>
              <Reply aria-hidden="true" />
              Reply
            </DropdownMenu.Item>
            <DropdownMenu.Item className={menuItem} onSelect={() => void copy()}>
              <Copy aria-hidden="true" />
              Copy text
            </DropdownMenu.Item>
            {canEdit && (
              <DropdownMenu.Item className={menuItem} onSelect={() => onEdit(message)}>
                <Pencil aria-hidden="true" />
                Edit
              </DropdownMenu.Item>
            )}
            {mine && (
              <>
                <DropdownMenu.Separator className={menuSeparator} />
                <DropdownMenu.Item className={cn(menuItem, menuItemDanger)} onSelect={() => onDelete(message)}>
                  <Trash2 aria-hidden="true" />
                  Delete
                </DropdownMenu.Item>
              </>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );

  return (
    // tabIndex lets a tap on touch screens reveal the actions (via focus-within).
    <div
      id={`message-${message.id}`}
      tabIndex={-1}
      className={cn(
        "group flex items-end gap-1 rounded-2xl outline-none",
        mine ? "flex-row-reverse" : "flex-row",
        first ? "mt-3" : "mt-0.5",
      )}
    >
      <div className={cn("flex min-w-0 max-w-[min(85%,36rem)] flex-col", mine ? "items-end" : "items-start")}>
        {showSender && first && (
          <span dir="auto" className="mb-1 px-3 text-xs font-medium text-fg-subtle">
            {message.sender.name}
          </span>
        )}
        <Bubble
          mine={mine}
          first={first}
          last={last}
          body={message.body ?? ""}
          reply={message.reply_to ?? null}
          meId={meId}
          onQuoteClick={onQuoteClick}
          meta={
            <>
              {message.is_edited && <span>edited · </span>}
              <time dateTime={message.created_at}>{formatTime(message.created_at)}</time>
            </>
          }
        />
        {message.reactions && message.reactions.length > 0 && (
          <div className={cn("-mt-1.5 flex flex-wrap gap-1 px-2", mine && "justify-end")}>
            {message.reactions.map((reaction) => (
              <span
                key={reaction.emoji}
                title={reaction.users.map((u) => u.name).join(", ")}
                className="rounded-full bg-surface px-1.5 py-0.5 text-xs shadow-soft ring-1 ring-line"
              >
                {reaction.emoji} {reaction.count > 1 && <span className="text-fg-muted">{reaction.count}</span>}
              </span>
            ))}
          </div>
        )}
      </div>
      {actions}
    </div>
  );
}

/** An own message still being sent, or one that failed. */
export function PendingBubble({
  pending,
  meId,
  first,
  onRetry,
  onDiscard,
  onQuoteClick,
}: {
  pending: PendingMessage;
  meId?: number;
  first: boolean;
  onRetry: (pending: PendingMessage) => void;
  onDiscard: (pending: PendingMessage) => void;
  onQuoteClick: (messageId: number) => void;
}) {
  const failed = pending.status === "failed";

  return (
    <div className={cn("flex flex-col items-end", first ? "mt-3" : "mt-0.5")}>
      <div className={cn("flex max-w-[min(85%,36rem)] flex-col items-end", !failed && "opacity-75")}>
        <Bubble
          mine
          first={first}
          last
          body={pending.body}
          reply={pending.replyTo}
          meId={meId}
          onQuoteClick={onQuoteClick}
          meta={
            failed ? (
              <CircleAlert className="inline size-3.5" aria-label="Not sent" />
            ) : (
              <Clock3 className="inline size-3" aria-label="Sending" />
            )
          }
        />
      </div>
      {failed && (
        <p className="mt-1 flex items-center gap-2 px-1 text-xs text-danger">
          Not sent.
          <button
            type="button"
            onClick={() => onRetry(pending)}
            className="inline-flex items-center gap-1 font-semibold hover:underline"
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            Retry
          </button>
          <span aria-hidden="true">·</span>
          <button type="button" onClick={() => onDiscard(pending)} className="font-semibold hover:underline">
            Discard
          </button>
        </p>
      )}
    </div>
  );
}

function Bubble({
  mine,
  first,
  last,
  body,
  reply,
  meId,
  meta,
  onQuoteClick,
}: Position & {
  body: string;
  reply: ReplyTo | null;
  meId?: number;
  meta: ReactNode;
  onQuoteClick: (messageId: number) => void;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-[1.15rem] px-3.5 py-2 shadow-soft",
        mine ? "bg-bubble-out text-bubble-out-fg" : "bg-bubble-in text-bubble-in-fg ring-1 ring-line",
        mine && !first && "rounded-se-md",
        mine && !last && "rounded-ee-md",
        mine && last && "rounded-ee-[0.35rem]",
        !mine && !first && "rounded-ss-md",
        !mine && !last && "rounded-es-md",
        !mine && last && "rounded-es-[0.35rem]",
      )}
    >
      {reply && (
        <button
          type="button"
          onClick={() => onQuoteClick(reply.id)}
          className={cn(
            "mb-1.5 block w-full min-w-40 rounded-lg border-s-[3px] px-2.5 py-1.5 text-start text-[0.8125rem] outline-none focus-visible:ring-2 focus-visible:ring-ring",
            mine ? "border-white/70 bg-black/10 hover:bg-black/15" : "border-primary bg-surface-2 hover:bg-surface-3",
          )}
        >
          <span className={cn("block font-semibold", mine ? "text-bubble-out-fg" : "text-primary")}>
            {reply.sender.id === meId ? "You" : reply.sender.name}
          </span>
          <span dir="auto" className="line-clamp-2 opacity-80">
            {reply.body}
          </span>
        </button>
      )}
      <p dir="auto" className="text-[0.9375rem] leading-relaxed break-words whitespace-pre-wrap">
        <MessageText text={body} />
        <span
          className={cn(
            "float-end ms-3 mt-[0.4rem] text-[0.6875rem] leading-none select-none",
            mine ? "text-bubble-out-fg/70" : "text-fg-subtle",
          )}
        >
          {/* Isolated so a time inside right-to-left text doesn't read "AM 9:11". */}
          <span dir="auto">{meta}</span>
        </span>
      </p>
    </div>
  );
}
