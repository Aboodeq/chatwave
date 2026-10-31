import { useLayoutEffect, type KeyboardEvent, type RefObject } from "react";
import { Check, Pencil, Reply, SendHorizontal, X } from "lucide-react";
import { cn, isTouchDevice } from "../../lib/utils";
import type { Message } from "../../types/message";
import { IconButton } from "../ui/IconButton";

export const MAX_MESSAGE_LENGTH = 5000;

/** The box grows with the text up to this height (about eight lines), then scrolls. */
const MAX_HEIGHT = 216;

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  /** Arrow Up in an empty box edits your last message. */
  onEditLast: () => void;
  replyTo: Message | null;
  editing: Message | null;
  meId?: number;
  placeholder: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

export function Composer({
  value,
  onChange,
  onSubmit,
  onCancel,
  onEditLast,
  replyTo,
  editing,
  meId,
  placeholder,
  textareaRef,
}: ComposerProps) {
  const canSend = value.trim().length > 0 && value.length <= MAX_MESSAGE_LENGTH;
  const remaining = MAX_MESSAGE_LENGTH - value.length;
  const context = editing ?? replyTo;

  // Grow with the text. scrollHeight leaves out the borders, so add them back; without
  // that the box is 2px short and Windows shows a scrollbar even when it's empty.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const borders = el.offsetHeight - el.clientHeight;
    const needed = el.scrollHeight + borders;
    el.style.height = `${Math.min(needed, MAX_HEIGHT)}px`;
    el.style.overflowY = needed > MAX_HEIGHT ? "auto" : "hidden";
  }, [value, textareaRef]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) return; // e.g. picking a character in an IME
    if (event.key === "Enter" && !event.shiftKey && !isTouchDevice()) {
      event.preventDefault();
      if (canSend) onSubmit();
    } else if (event.key === "Escape" && context) {
      event.preventDefault();
      onCancel();
    } else if (event.key === "ArrowUp" && value === "" && !editing) {
      event.preventDefault();
      onEditLast();
    }
  };

  return (
    <div className="shrink-0 border-t border-line bg-surface px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-6 lg:px-8">
      <div>
        {context && (
          <div className="mb-2 flex animate-rise items-center gap-3 rounded-xl bg-surface-2 py-2 ps-3 pe-1.5">
            {editing ? (
              <Pencil className="size-4 shrink-0 text-primary" aria-hidden="true" />
            ) : (
              <Reply className="size-4 shrink-0 text-primary" aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1 border-s-2 border-primary ps-2.5">
              <p className="text-xs font-semibold text-primary">
                {editing
                  ? "Editing message"
                  : `Replying to ${replyTo?.sender.id === meId ? "yourself" : replyTo?.sender.name}`}
              </p>
              <p dir="auto" className="truncate text-sm text-fg-muted">
                {context.body}
              </p>
            </div>
            <IconButton icon={X} size="sm" label={editing ? "Cancel editing" : "Cancel reply"} onClick={onCancel} />
          </div>
        )}

        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (canSend) onSubmit();
          }}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-label="Message"
            dir="auto"
            className={cn(
              "scrollbar-thin min-h-11 flex-1 resize-none overflow-y-hidden rounded-[1.375rem] border border-line-strong bg-canvas px-4 py-2.5 text-base leading-6 text-fg md:text-[0.9375rem]",
              "placeholder:text-fg-subtle outline-none transition-[border-color,box-shadow,background-color]",
              "focus:border-primary focus:bg-surface focus:ring-4 focus:ring-primary/15",
              remaining < 0 && "border-danger focus:border-danger focus:ring-danger/15",
            )}
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label={editing ? "Save changes" : "Send message"}
            title={editing ? "Save changes" : "Send"}
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-fg shadow-soft transition-[background-color,transform] outline-none",
              "hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:scale-95",
              "disabled:bg-surface-3 disabled:text-fg-subtle disabled:shadow-none",
            )}
          >
            {editing ? (
              <Check className="size-5" aria-hidden="true" />
            ) : (
              <SendHorizontal className="size-5 rtl:-scale-x-100" aria-hidden="true" />
            )}
          </button>
        </form>

        {remaining < 500 && (
          <p className={cn("mt-1.5 text-end text-xs", remaining < 0 ? "text-danger" : "text-fg-subtle")} aria-live="polite">
            {remaining < 0 ? `${-remaining} characters over the limit` : `${remaining} characters left`}
          </p>
        )}
      </div>
    </div>
  );
}
